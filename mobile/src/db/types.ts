import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

/** Synchronous Drizzle database: expo-sqlite in the app, better-sqlite3 in Node tests. Transactions pass the same type. */
export type Db = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

export type Clock = () => string;

/** Everything a repository write needs. `newId` and `now` are injectable for tests. */
export interface Ctx {
  db: Db;
  userId: string;
  newId: () => string;
  /** ISO time (device time corrected by the stored server offset). */
  now: Clock;
}

/** One user action = one SQLite transaction. `at` is the single timestamp of the action. */
export function act<T>(ctx: Ctx, fn: (tx: Db, at: string) => T): T {
  const at = ctx.now();
  return ctx.db.transaction((tx) => fn(tx, at));
}
