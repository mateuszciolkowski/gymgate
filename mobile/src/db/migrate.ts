import { migrations } from "./migrations/migrations";
import type { Db } from "./types";

/** Applies pending migrations (idempotent). Call once after opening, before the first read. Driver independent. */
export function applyMigrations(db: Db): void {
  // `dialect`/`session` are public on every Drizzle SQLite database, and sync dialects migrate synchronously.
  const d = db as unknown as {
    dialect: { migrate(m: typeof migrations, session: unknown): void };
    session: unknown;
  };
  d.dialect.migrate(migrations, d.session);
}
