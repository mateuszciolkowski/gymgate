import { eq, getTableColumns, notInArray } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { PullData, WireWorkout, WirePlan } from "../api/contract";
import { deleteExerciseRows } from "../db/repositories/exercises";
import { deleteItemRows } from "../db/repositories/items";
import { deletePlanRows } from "../db/repositories/plans";
import { saveProfile } from "../db/repositories/profile";
import { deleteWorkoutRows } from "../db/repositories/workouts";
import { exercises, outbox, pendingNotes, planItems, plans, syncState, workoutItems, workoutSets, workouts } from "../db/schema";
import type { Db } from "../db/types";
import type { OutboxEntity } from "./outbox";

/** Ids of paged snapshot rows (workouts, items, sets); rows missing from the server are pruned on the last page. */
export interface SeenIds {
  workout: Set<string>;
  item: Set<string>;
  set: Set<string>;
}
export const newSeen = (): SeenIds => ({ workout: new Set(), item: new Set(), set: new Set() });

/** Records with an unsent op: pull must not overwrite them (PLAN 5.4 rule 1). */
function pendingKeys(tx: Db): Set<string> {
  return new Set(tx.select({ e: outbox.entity, id: outbox.entityId }).from(outbox).where(eq(outbox.state, "pending")).all().map((r) => `${r.e}:${r.id}`));
}

type IdTable = SQLiteTable & { id: SQLiteColumn };

function upsert<T extends IdTable>(tx: Db, table: T, row: T["$inferInsert"]): void {
  tx.insert(table).values(row).onConflictDoUpdate({ target: table.id, set: row }).run();
}

export function upsertPlan(tx: Db, p: WirePlan): void {
  const { items, isFavorite, ...rest } = p;
  upsert(tx, plans, { ...rest, ...(isFavorite !== undefined && { isFavorite }) });
  tx.delete(planItems).where(eq(planItems.planId, p.id)).run();
  for (const i of items) tx.insert(planItems).values({ id: i.id, planId: p.id, exerciseId: i.exerciseId, orderInPlan: i.orderInPlan }).run();
}

export interface ApplyOptions {
  /** Snapshot page 1 also prunes exercises, plans and notes (it carries all of them). */
  prune?: "first";
  seen?: SeenIds;
}

/** Applies upserts and deletes of one pull response inside the caller's transaction (PLAN 5.4 rules 1-3). */
export function applyPull(tx: Db, data: PullData, opts: ApplyOptions = {}): void {
  const pending = pendingKeys(tx);
  const outboxEmpty = pending.size === 0;
  const free = (entity: OutboxEntity, id: string) => !pending.has(`${entity}:${id}`);
  const u = data.upserts;

  for (const e of u.exercises) if (free("exercise", e.id)) upsert(tx, exercises, e);
  for (const p of u.plans) if (free("plan", p.id)) upsertPlan(tx, p);
  for (const w of u.workouts) {
    opts.seen?.workout.add(w.id);
    if (free("workout", w.id)) upsert(tx, workouts, w);
  }
  for (const i of u.workoutItems) {
    opts.seen?.item.add(i.id);
    if (free("item", i.id)) upsert(tx, workoutItems, i);
  }
  for (const s of u.workoutSets) {
    opts.seen?.set.add(s.id);
    if (free("set", s.id)) upsert(tx, workoutSets, s);
  }
  if (outboxEmpty) {
    for (const n of u.pendingNotes) {
      tx.insert(pendingNotes)
        .values({ id: n.exerciseId, exerciseId: n.exerciseId, note: n.note, updatedAt: n.updatedAt })
        .onConflictDoUpdate({ target: pendingNotes.exerciseId, set: { note: n.note, updatedAt: n.updatedAt } })
        .run();
    }
  }
  if (u.profile) saveProfile(tx, { ...u.profile, activeWorkoutId: outboxEmpty ? u.profile.activeWorkoutId : undefined });

  for (const d of data.deletes) {
    if (d.entity === "workout") deleteWorkoutRows(tx, d.id);
    else if (d.entity === "workoutItem") deleteItemRows(tx, d.id);
    else if (d.entity === "workoutSet") tx.delete(workoutSets).where(eq(workoutSets.id, d.id)).run();
    else if (d.entity === "exercise") deleteExerciseRows(tx, d.id);
    else if (d.entity === "plan") deletePlanRows(tx, d.id);
    else if (outboxEmpty) tx.delete(pendingNotes).where(eq(pendingNotes.exerciseId, d.id)).run();
  }

  if (opts.prune === "first") {
    const keep = (entity: OutboxEntity, id: string, seen: Set<string>) => seen.has(id) || !free(entity, id);
    const seenEx = new Set(u.exercises.map((e) => e.id));
    for (const r of tx.select({ id: exercises.id }).from(exercises).all()) if (!keep("exercise", r.id, seenEx)) deleteExerciseRows(tx, r.id);
    const seenPlans = new Set(u.plans.map((p) => p.id));
    for (const r of tx.select({ id: plans.id }).from(plans).all()) if (!keep("plan", r.id, seenPlans)) deletePlanRows(tx, r.id);
    if (outboxEmpty) {
      const ids = u.pendingNotes.map((n) => n.exerciseId);
      tx.delete(pendingNotes).where(ids.length ? notInArray(pendingNotes.exerciseId, ids) : undefined).run();
    }
  }
}

/** Last snapshot page: remove local workouts, items and sets the server no longer has (except rows with unsent ops). */
export function pruneWorkouts(tx: Db, seen: SeenIds): void {
  const pending = pendingKeys(tx);
  for (const r of tx.select({ id: workouts.id }).from(workouts).all()) {
    if (!seen.workout.has(r.id) && !pending.has(`workout:${r.id}`)) deleteWorkoutRows(tx, r.id);
  }
  for (const r of tx.select({ id: workoutItems.id }).from(workoutItems).all()) {
    if (!seen.item.has(r.id) && !pending.has(`item:${r.id}`)) deleteItemRows(tx, r.id);
  }
  for (const r of tx.select({ id: workoutSets.id }).from(workoutSets).all()) {
    if (!seen.set.has(r.id) && !pending.has(`set:${r.id}`)) tx.delete(workoutSets).where(eq(workoutSets.id, r.id)).run();
  }
}

export function saveCursor(tx: Db, cursor: string, initial: string | null): void {
  const set = { cursor, ...(initial && { initialPullAt: initial }) };
  tx.insert(syncState).values({ id: 1, ...set }).onConflictDoUpdate({ target: syncState.id, set }).run();
}

const pickCols = (table: SQLiteTable, row: object): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(getTableColumns(table))) if (k in row) out[k] = (row as Record<string, unknown>)[k];
  return out;
};

type Nested = Record<string, unknown> & { items?: Array<Record<string, unknown> & { sets?: object[] }>; sets?: object[]; photos?: unknown[] };

/**
 * Turns the `current` of a push result (nested Prisma row) into pull-shaped upserts so the same apply code,
 * including the "unsent op wins" rule, restores the server version.
 */
export function currentToPull(entity: OutboxEntity, current: object): PullData["upserts"] {
  const c = current as Nested;
  const empty: PullData["upserts"] = { workouts: [], workoutItems: [], workoutSets: [], exercises: [], plans: [], pendingNotes: [], profile: null };
  const sets = (list: object[] | undefined) => (list ?? []).map((s) => pickCols(workoutSets, s) as PullData["upserts"]["workoutSets"][number]);
  const item = (i: Record<string, unknown>) => pickCols(workoutItems, i) as PullData["upserts"]["workoutItems"][number];
  if (entity === "workout") {
    return {
      ...empty,
      workouts: [pickCols(workouts, c) as WireWorkout],
      workoutItems: (c.items ?? []).map(item),
      workoutSets: (c.items ?? []).flatMap((i) => sets(i.sets)),
    };
  }
  if (entity === "item") return { ...empty, workoutItems: [item(c)], workoutSets: sets(c.sets) };
  if (entity === "set") return { ...empty, workoutSets: sets([c]) };
  if (entity === "exercise") return { ...empty, exercises: [pickCols(exercises, c) as PullData["upserts"]["exercises"][number]] };
  const items = (c.items ?? []).map((i) => ({ id: String(i.id), exerciseId: String(i.exerciseId), orderInPlan: Number(i.orderInPlan) }));
  return { ...empty, plans: [{ ...(pickCols(plans, c) as Omit<WirePlan, "items">), items }] };
}

/** Deletes one local record with its cascade (used when a discarded op has no server version to restore). */
export function deleteLocal(tx: Db, entity: OutboxEntity, id: string): void {
  if (entity === "workout") deleteWorkoutRows(tx, id);
  else if (entity === "item") deleteItemRows(tx, id);
  else if (entity === "set") tx.delete(workoutSets).where(eq(workoutSets.id, id)).run();
  else if (entity === "exercise") deleteExerciseRows(tx, id);
  else deletePlanRows(tx, id);
}

