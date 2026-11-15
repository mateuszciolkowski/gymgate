import { drizzle } from "drizzle-orm/expo-sqlite";
import { addDatabaseChangeListener, deleteDatabaseSync, openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { applyMigrations } from "./migrate";
import * as schema from "./schema";
import type { Db } from "./types";

const fileOf = (userId: string) => `gymgate-${userId}.db`;
const open = new Map<string, { sqlite: SQLiteDatabase; db: Db }>();

/** App entry: one file per account (PLAN 4). Opens once per account, enables WAL and change events, migrates. */
export function openAppDb(userId: string): Db {
  const cached = open.get(userId);
  if (cached) return cached.db;
  const sqlite = openDatabaseSync(fileOf(userId), { enableChangeListener: true });
  sqlite.execSync("PRAGMA journal_mode = WAL;");
  const db = drizzle(sqlite, { schema });
  applyMigrations(db);
  open.set(userId, { sqlite, db });
  return db;
}

export function closeAppDb(userId: string): void {
  open.get(userId)?.sqlite.closeSync();
  open.delete(userId);
}

/** Closes and removes the file (logout with "discard", account deletion). */
export function deleteAppDb(userId: string): void {
  closeAppDb(userId);
  deleteDatabaseSync(fileOf(userId));
}

/** The single live-update mechanism of the UI: `listener` runs after any row of any open account database changed. */
export function onDbChange(listener: () => void): () => void {
  const sub = addDatabaseChangeListener(listener);
  return () => sub.remove();
}
