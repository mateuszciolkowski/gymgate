import { and, asc, count, eq } from "drizzle-orm";
import { outbox, syncIssues } from "../db/schema";
import type { Db } from "../db/types";

export type OutboxEntity = "workout" | "item" | "set" | "exercise" | "plan";

export type OutboxRow = typeof outbox.$inferSelect;

export const MAX_BATCH = 100;

export interface NewOp {
  opId: string;
  type: string;
  at: string;
  entity: OutboxEntity;
  entityId: string;
  /** Operation fields without opId/type/at (flat wire format of backend sync.schema.ts). */
  fields: Record<string, unknown>;
}

/** Inserts a pending op. Pass the caller's transaction so data change and op commit together. */
export function enqueue(tx: Db, op: NewOp): void {
  const payload = { opId: op.opId, type: op.type, at: op.at, ...op.fields };
  tx.insert(outbox)
    .values({
      opId: op.opId,
      type: op.type,
      payload: JSON.stringify(payload),
      entity: op.entity,
      entityId: op.entityId,
      createdAt: op.at,
    })
    .run();
}

/** Pending ops in `seq` order, ready to send. Rejected ones stay out of the queue. */
export function nextBatch(db: Db, limit: number = MAX_BATCH): OutboxRow[] {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.state, "pending"))
    .orderBy(asc(outbox.seq))
    .limit(Math.min(limit, MAX_BATCH))
    .all();
}

/** applied / duplicate / superseded: the op is done. */
export function markApplied(db: Db, opIds: string[]): void {
  db.transaction((tx) => {
    for (const opId of opIds) tx.delete(outbox).where(eq(outbox.opId, opId)).run();
  });
}

/** Permanent rejection: keep the op as `rejected` and open a `sync_issues` row for the user. */
export function markRejected(
  db: Db,
  opId: string,
  rejection: { code?: string; error: string; current?: unknown },
  at: string,
): void {
  db.transaction((tx) => {
    const row = tx.select().from(outbox).where(eq(outbox.opId, opId)).get();
    if (!row) return;
    tx.update(outbox).set({ state: "rejected", lastError: rejection.error }).where(eq(outbox.opId, opId)).run();
    tx.insert(syncIssues)
      .values({
        opId,
        type: row.type,
        entity: row.entity,
        entityId: row.entityId,
        payload: row.payload,
        code: rejection.code ?? null,
        error: rejection.error,
        current: rejection.current == null ? null : JSON.stringify(rejection.current),
        createdAt: at,
      })
      .run();
  });
}

/** Transient failure of a whole request: remember the attempt. */
export function markAttempt(db: Db, opIds: string[], error: string): void {
  db.transaction((tx) => {
    for (const opId of opIds) {
      const row = tx.select({ attempts: outbox.attempts }).from(outbox).where(eq(outbox.opId, opId)).get();
      if (row) tx.update(outbox).set({ attempts: row.attempts + 1, lastError: error }).where(eq(outbox.opId, opId)).run();
    }
  });
}

/** Number of unsent changes (banner counter). */
export function pendingCount(db: Db): number {
  return db.select({ n: count() }).from(outbox).where(eq(outbox.state, "pending")).get()?.n ?? 0;
}

/** True when an unsent op touches this record (pull must not overwrite it, PLAN 5.4). Rejected ops do not count. */
export function hasPendingOpFor(db: Db, entity: OutboxEntity, entityId: string): boolean {
  return (
    db
      .select({ seq: outbox.seq })
      .from(outbox)
      .where(and(eq(outbox.entity, entity), eq(outbox.entityId, entityId), eq(outbox.state, "pending")))
      .limit(1)
      .get() !== undefined
  );
}
