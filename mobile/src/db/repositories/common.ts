import { enqueue, type OutboxEntity } from "../../sync/outbox";
import type { Ctx, Db } from "../types";

/** Queues the wire operation for the current action (same transaction as the data change). */
export function emit(
  ctx: Ctx,
  tx: Db,
  at: string,
  type: string,
  entity: OutboxEntity,
  entityId: string,
  fields: Record<string, unknown>,
): void {
  enqueue(tx, { opId: ctx.newId(), type, at, entity, entityId, fields });
}

/** Chunked IN-list statements, well below SQLite's variable limit. */
export function forChunks(ids: string[], fn: (chunk: string[]) => void): void {
  for (let i = 0; i < ids.length; i += 500) fn(ids.slice(i, i + 500));
}

export function inChunks<T>(ids: string[], read: (chunk: string[]) => T[]): T[] {
  const out: T[] = [];
  forChunks(ids, (c) => out.push(...read(c)));
  return out;
}

export class NotFoundLocalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundLocalError";
  }
}

/** "" -> null for clearable text fields (D-23). */
export const emptyToNull = (v: string | null | undefined): string | null => (v == null || v === "" ? null : v);
