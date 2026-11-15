import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { asc } from "drizzle-orm";
import { saveProfile } from "./repositories/profile";
import { applyMigrations } from "./migrate";
import * as schema from "./schema";
import { exercises, outbox } from "./schema";
import type { Ctx, Db } from "./types";

/** Node-only (tests, parity script): in-memory or file database on better-sqlite3 with migrations applied. */
export function openNodeDb(file = ":memory:"): Db {
  const db = drizzle(new Database(file), { schema });
  applyMigrations(db);
  return db;
}

/** Deterministic ids ("id-1", "id-2"...) and a controllable clock for tests. */
export function testCtx(db: Db, userId = "u1", start = "2026-01-01T10:00:00.000Z") {
  let n = 0;
  let t = new Date(start).getTime();
  const ctx: Ctx = {
    db,
    userId,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    now: () => new Date((t += 1000)).toISOString(),
  };
  return ctx;
}

/** Test world: migrated in-memory DB, deterministic ctx, signed-in profile (non-admin unless asked). */
export function setupWorld(opts: { isAdmin?: boolean } = {}) {
  const db = openNodeDb();
  const ctx = testCtx(db);
  saveProfile(db, { id: ctx.userId, email: "t@t.pl", firstName: "T", lastName: "T", phone: null, isAdmin: opts.isAdmin ?? false });
  return { db, ctx };
}

export const GLOBAL = null;

/** Inserts an exercise row directly (no outbox), e.g. built-in ones as pull would. */
export function seedExercise(db: Db, id: string, name: string, creatorUserId: string | null = null): void {
  db.insert(exercises)
    .values({ id, name, muscleGroups: ["CHEST"], description: null, creatorUserId, photos: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })
    .run();
}

/** Parsed outbox payloads in seq order. */
export function outboxOps(db: Db): Array<Record<string, unknown>> {
  return db
    .select()
    .from(outbox)
    .orderBy(asc(outbox.seq))
    .all()
    .map((r) => JSON.parse(r.payload) as Record<string, unknown>);
}
