import { eq } from "drizzle-orm";
import type { PullData, Transport } from "../api/contract";
import { syncState } from "../db/schema";
import type { Db } from "../db/types";
import { applyPull, newSeen, pruneWorkouts, saveCursor } from "./apply";
import { recordServerTime } from "./clock";

export interface PullDeps {
  db: Db;
  api: Transport;
}

export interface PullOutcome {
  /** True when a full snapshot ran (first sync, resyncRequired or forced). */
  snapshot: boolean;
  pages: number;
}

const get = async (api: Transport, query: string): Promise<PullData> =>
  (await api.get<{ data: PullData }>(`/api/sync/pull${query}`)).data;

/** Paged snapshot: every page is one transaction; the cursor is stored only with the last page (PLAN 5.4). */
export async function pullSnapshot({ db, api }: PullDeps): Promise<PullOutcome> {
  const seen = newSeen();
  let token: string | null = null;
  let pages = 0;
  for (;;) {
    const data = await get(api, token ? `?snapshotToken=${encodeURIComponent(token)}` : "");
    const first = pages === 0;
    pages++;
    if (data.hasMore && !data.snapshotToken) throw new Error("Snapshot page without snapshotToken");
    if (!data.hasMore && !data.cursor) throw new Error("Snapshot without cursor");
    db.transaction((tx) => {
      recordServerTime(tx, data.serverTime);
      applyPull(tx, data, { seen, prune: first ? "first" : undefined });
      if (!data.hasMore) {
        pruneWorkouts(tx, seen);
        saveCursor(tx, data.cursor as string, data.serverTime);
      }
    });
    if (!data.hasMore) return { snapshot: true, pages };
    token = data.snapshotToken ?? null;
  }
}

/** Incremental pull while `hasMore`; falls back to a snapshot on `resyncRequired` or when there is no cursor yet. */
export async function pullAll(deps: PullDeps, opts: { forceSnapshot?: boolean } = {}): Promise<PullOutcome> {
  const { db, api } = deps;
  let cursor = db.select().from(syncState).where(eq(syncState.id, 1)).get()?.cursor ?? null;
  if (!cursor || opts.forceSnapshot) return pullSnapshot(deps);
  let pages = 0;
  for (;;) {
    const data = await get(api, `?cursor=${encodeURIComponent(cursor)}`);
    if (data.resyncRequired) return pullSnapshot(deps);
    if (!data.cursor) throw new Error("Pull response without cursor");
    const next: string = data.cursor;
    pages++;
    db.transaction((tx) => {
      recordServerTime(tx, data.serverTime);
      applyPull(tx, data);
      saveCursor(tx, next, null);
    });
    if (!data.hasMore) return { snapshot: false, pages };
    cursor = next;
  }
}
