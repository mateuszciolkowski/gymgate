import type { PushResponse, Transport } from "../api/contract";
import type { Db } from "../db/types";
import { applyPull, currentToPull } from "./apply";
import { recordServerTime } from "./clock";
import { markApplied, markAttempt, markRejected, nextBatch, type OutboxEntity, type OutboxRow } from "./outbox";
import { isTransient } from "../api/errors";

export interface PushDeps {
  db: Db;
  api: Transport;
  deviceId: string;
  /** ISO time for issue rows. */
  now: () => string;
}

export interface PushOutcome {
  sent: number;
  rejected: number;
}

/** Restores the server version of a record we lost to a newer change (`superseded`). */
function restoreCurrent(tx: Db, row: OutboxRow, current: unknown): void {
  if (current && typeof current === "object") {
    applyPull(tx, { cursor: null, hasMore: false, resyncRequired: false, deletes: [], serverTime: "", upserts: currentToPull(row.entity as OutboxEntity, current) });
  }
}

/**
 * Sends the outbox in batches of up to 100 (seq order) until it is empty. A transient failure rethrows and keeps
 * the batch untouched (same opIds on the next try); any other failure also leaves the queue as it is.
 */
export async function pushAll({ db, api, deviceId, now }: PushDeps): Promise<PushOutcome> {
  const outcome: PushOutcome = { sent: 0, rejected: 0 };
  for (;;) {
    const batch = nextBatch(db);
    if (batch.length === 0) return outcome;
    let data: PushResponse["data"];
    try {
      data = (await api.post<PushResponse>("/api/sync/push", { deviceId, ops: batch.map((r) => JSON.parse(r.payload) as unknown) })).data;
    } catch (error) {
      if (isTransient(error)) markAttempt(db, batch.map((r) => r.opId), error instanceof Error ? error.message : "transient error");
      throw error;
    }
    const byId = new Map(data.results.map((r) => [r.opId, r]));
    let handled = 0;
    db.transaction((tx) => {
      recordServerTime(tx, data.serverTime);
      for (const row of batch) {
        const r = byId.get(row.opId);
        if (!r) continue;
        handled++;
        if (r.status === "rejected") {
          markRejected(tx, row.opId, { code: r.code, error: r.error ?? "Rejected", current: r.current }, now());
          outcome.rejected++;
        } else {
          markApplied(tx, [row.opId]);
          if (r.status === "superseded") restoreCurrent(tx, row, r.current);
        }
      }
    });
    outcome.sent += handled;
    if (handled === 0) throw new Error("Push response contained no results for the sent operations");
  }
}
