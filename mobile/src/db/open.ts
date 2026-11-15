import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { applyMigrations } from "./migrate";
import * as schema from "./schema";
import type { Db } from "./types";

/** App entry: one file per account (PLAN 4). Opens, enables WAL, migrates. */
export function openAppDb(userId: string): Db {
  const sqlite = openDatabaseSync(`gymgate-${userId}.db`);
  sqlite.execSync("PRAGMA journal_mode = WAL;");
  const db = drizzle(sqlite, { schema });
  applyMigrations(db);
  return db;
}
