import { BadRequestError } from "../../common/errors.js";
import * as repo from "./sync.pull.repository.js";
import type { PullQuery } from "./sync.schema.js";

/** Max changes per incremental response and workouts per snapshot page (PLAN 5.4). */
export const MAX_PULL_CHANGES = 500;
export const SNAPSHOT_WORKOUTS_PER_PAGE = 200;
/** Journal / processed-operation retention; a cursor issued earlier needs a full resync. */
export const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

type Entity = "workout" | "workoutItem" | "workoutSet" | "exercise" | "plan" | "pendingNote";

export interface Upserts {
  workouts: unknown[];
  workoutItems: unknown[];
  workoutSets: unknown[];
  exercises: unknown[];
  plans: unknown[];
  pendingNotes: unknown[];
  profile: unknown | null;
}

export interface PullResponse {
  cursor: string | null;
  hasMore: boolean;
  resyncRequired: boolean;
  /** Present only for snapshot pages: token of the next page (null on the last one). */
  snapshotToken?: string | null;
  upserts: Upserts;
  deletes: Array<{ entity: Entity; id: string }>;
  serverTime: string;
}

// ---- cursor ------------------------------------------------------------------------------

/**
 * Cursor = position in the journal (txid, seq) plus the time it was issued.
 * `v1.<txid>.<seq>.<issuedAtMs>`; `<xmin>.0` means "every transaction >= xmin".
 */
export const encodeCursor = (txid: bigint, seq: bigint, issuedAt: Date): string =>
  `v1.${txid}.${seq}.${issuedAt.getTime()}`;

export const decodeCursor = (cursor: string): { txid: bigint; seq: bigint; issuedAt: number } => {
  const m = /^v1\.(\d{1,19})\.(\d{1,19})\.(\d{1,15})$/.exec(cursor);
  if (!m) throw new BadRequestError("Nieprawidłowy kursor");
  return { txid: BigInt(m[1]!), seq: BigInt(m[2]!), issuedAt: Number(m[3]!) };
};

const encodeToken = (cursor: string, after: string): string =>
  Buffer.from(JSON.stringify({ c: cursor, a: after })).toString("base64url");

const decodeToken = (token: string): { cursor: string; after: string } => {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as { c?: unknown; a?: unknown };
    if (typeof parsed.c === "string" && typeof parsed.a === "string") {
      decodeCursor(parsed.c);
      return { cursor: parsed.c, after: parsed.a };
    }
  } catch {
    // fall through
  }
  throw new BadRequestError("Nieprawidłowy token pobierania");
};

// ---- row mapping -------------------------------------------------------------------------

/** Decimal comes out of Prisma as an object; the wire format is the decimal string ("62.5"). */
const flatSet = <T extends { weight: { toString(): string } }>(s: T) => ({ ...s, weight: s.weight.toString() });

const emptyUpserts = (): Upserts => ({
  workouts: [],
  workoutItems: [],
  workoutSets: [],
  exercises: [],
  plans: [],
  pendingNotes: [],
  profile: null,
});

const withFavorite = <T extends { id: string }>(plans: T[], favorites: Set<string>) =>
  plans.map((p) => ({ ...p, isFavorite: favorites.has(p.id) }));

const ids = (rows: Array<{ id: string }>) => new Set(rows.map((r) => r.id));
const missing = (entity: Entity, wanted: string[], found: Set<string>) =>
  wanted.filter((id) => !found.has(id)).map((id) => ({ entity, id }));

// ---- snapshot (no cursor) ----------------------------------------------------------------

const snapshot = async (userId: string, token: string | undefined, now: Date): Promise<PullResponse> => {
  let cursor: string;
  let after: string | null = null;
  if (token) {
    ({ cursor, after } = decodeToken(token));
  } else {
    // Remember the position BEFORE reading anything: every transaction >= xmin is replayed by
    // the first incremental pull, so writes that land while the snapshot is paged are not lost.
    cursor = encodeCursor(await repo.currentXmin(), 0n, now);
  }

  const upserts = emptyUpserts();
  if (!token) {
    // Small, bounded collections go out on the first page.
    const [exercises, plans, favorites, notes, profile] = await Promise.all([
      repo.findExercises(userId),
      repo.findPlans(userId),
      repo.findFavoritePlanIds(userId),
      repo.findPendingNotes(userId),
      repo.findProfile(userId),
    ]);
    upserts.exercises = exercises;
    upserts.plans = withFavorite(plans, favorites);
    upserts.pendingNotes = notes;
    upserts.profile = profile;
  }

  const page = await repo.findWorkoutPage(userId, after, SNAPSHOT_WORKOUTS_PER_PAGE + 1);
  const hasMore = page.length > SNAPSHOT_WORKOUTS_PER_PAGE;
  const workouts = hasMore ? page.slice(0, SNAPSHOT_WORKOUTS_PER_PAGE) : page;
  const items = workouts.length ? await repo.findItemsOfWorkouts(workouts.map((w) => w.id)) : [];
  const sets = items.length ? await repo.findSetsOfItems(items.map((i) => i.id)) : [];
  upserts.workouts = workouts;
  upserts.workoutItems = items;
  upserts.workoutSets = sets.map(flatSet);

  return {
    cursor,
    hasMore,
    resyncRequired: false,
    snapshotToken: hasMore ? encodeToken(cursor, workouts[workouts.length - 1]!.id) : null,
    upserts,
    deletes: [],
    serverTime: now.toISOString(),
  };
};

// ---- incremental (with cursor) -----------------------------------------------------------

const incremental = async (userId: string, cursor: string, now: Date): Promise<PullResponse> => {
  const from = decodeCursor(cursor);
  const base = { serverTime: now.toISOString(), deletes: [], upserts: emptyUpserts() };

  // Every journal row older than the retention window may be purged, so a cursor issued before
  // it can have missed changes: the client must rebuild from a snapshot (outbox is kept).
  if (now.getTime() - from.issuedAt > RETENTION_MS) {
    return { ...base, cursor: null, hasMore: false, resyncRequired: true };
  }

  const { xmin, changes } = await repo.readChanges(userId, from.txid, from.seq, MAX_PULL_CHANGES + 1);
  const hasMore = changes.length > MAX_PULL_CHANGES;
  const taken = hasMore ? changes.slice(0, MAX_PULL_CHANGES) : changes;
  const last = taken[taken.length - 1];
  // Everything below xmin has been consumed when there is no next page, so skip ahead.
  const next = hasMore && last ? encodeCursor(last.txid, last.seq, now) : encodeCursor(xmin, 0n, now);

  const wanted = new Map<string, Set<string>>();
  for (const c of taken) {
    const set = wanted.get(c.entity) ?? new Set<string>();
    set.add(c.entityId);
    wanted.set(c.entity, set);
  }
  const idsOf = (e: Entity) => [...(wanted.get(e) ?? [])];

  // The journal only says "this record changed". The CURRENT state, seen by this user, decides:
  // exists and visible -> upsert; otherwise -> delete. Deletion and "became invisible"
  // (public plan made private) are therefore the same thing to the client.
  const upserts = base.upserts;
  const deletes: PullResponse["deletes"] = [];

  const wIds = idsOf("workout");
  if (wIds.length) {
    const rows = await repo.findWorkouts(userId, wIds);
    upserts.workouts = rows;
    deletes.push(...missing("workout", wIds, ids(rows)));
  }
  const iIds = idsOf("workoutItem");
  if (iIds.length) {
    const rows = await repo.findItems(userId, iIds);
    upserts.workoutItems = rows;
    deletes.push(...missing("workoutItem", iIds, ids(rows)));
  }
  const sIds = idsOf("workoutSet");
  if (sIds.length) {
    const rows = await repo.findSets(userId, sIds);
    upserts.workoutSets = rows.map(flatSet);
    deletes.push(...missing("workoutSet", sIds, ids(rows)));
  }
  const eIds = idsOf("exercise");
  if (eIds.length) {
    const rows = await repo.findExercises(userId, eIds);
    upserts.exercises = rows;
    deletes.push(...missing("exercise", eIds, ids(rows)));
  }
  const pIds = idsOf("plan");
  if (pIds.length) {
    const [rows, favorites] = await Promise.all([repo.findPlans(userId, pIds), repo.findFavoritePlanIds(userId, pIds)]);
    upserts.plans = withFavorite(rows, favorites);
    deletes.push(...missing("plan", pIds, ids(rows)));
  }
  const nIds = idsOf("pendingNote"); // the id of a pending note is its exercise id
  if (nIds.length) {
    const rows = await repo.findPendingNotes(userId, nIds);
    upserts.pendingNotes = rows;
    const found = new Set(rows.map((r) => r.exerciseId));
    deletes.push(...nIds.filter((id) => !found.has(id)).map((id) => ({ entity: "pendingNote" as const, id })));
  }
  if (wanted.has("profile")) upserts.profile = await repo.findProfile(userId);

  return { cursor: next, hasMore, resyncRequired: false, upserts, deletes, serverTime: base.serverTime };
};

export const pull = (userId: string, query: PullQuery): Promise<PullResponse> => {
  const now = new Date();
  if (query.cursor) return incremental(userId, query.cursor, now);
  return snapshot(userId, query.snapshotToken, now);
};

/** Retention job: journal and processed operations older than 90 days. */
export const purgeOldSyncData = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - RETENTION_MS);
  const [changes, operations] = await Promise.all([repo.purgeChangesBefore(cutoff), repo.purgeOperationsBefore(cutoff)]);
  return { changes, operations };
};
