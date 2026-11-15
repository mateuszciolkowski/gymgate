import { eq } from "drizzle-orm";
import { syncState } from "../db/schema";
import type { Clock, Db } from "../db/types";

/** Stored `serverTime - deviceTime` in ms (0 until the first server response). */
export function getClockOffset(db: Db): number {
  return db.select().from(syncState).where(eq(syncState.id, 1)).get()?.clockOffsetMs ?? 0;
}

/** Call with `serverTime` of every push/pull response. */
export function recordServerTime(db: Db, serverTimeIso: string, deviceNowMs: number = Date.now()): void {
  const clockOffsetMs = new Date(serverTimeIso).getTime() - deviceNowMs;
  db.insert(syncState).values({ id: 1, clockOffsetMs }).onConflictDoUpdate({ target: syncState.id, set: { clockOffsetMs } }).run();
}

/** Device time corrected by the stored offset (PLAN 4.3). The server additionally clamps future times. */
export function makeClock(db: Db, nowMs: () => number = Date.now): Clock {
  return () => new Date(nowMs() + getClockOffset(db)).toISOString();
}
