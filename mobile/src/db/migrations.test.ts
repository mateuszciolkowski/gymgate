import { sql } from "drizzle-orm";
import { applyMigrations } from "./migrate";
import { migrations } from "./migrations/migrations";
import { openNodeDb } from "./testing";

const tables = (db: ReturnType<typeof openNodeDb>) =>
  db
    .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    .map((r) => r.name);

describe("migrations", () => {
  it("apply cleanly on an empty database and create every table", () => {
    const db = openNodeDb();
    expect(tables(db)).toEqual(
      [
        "__drizzle_migrations",
        "exercises",
        "outbox",
        "pending_notes",
        "plan_items",
        "plans",
        "profile",
        "sync_issues",
        "sync_state",
        "workout_items",
        "workout_sets",
        "workouts",
      ].sort(),
    );
  });

  it("are idempotent: a second run applies nothing", () => {
    const db = openNodeDb();
    applyMigrations(db);
    const rows = db.all<{ n: number }>(sql`SELECT count(*) AS n FROM __drizzle_migrations`);
    expect(rows[0]?.n).toBe(migrations.length);
  });

  it("keeps existing data when a later run happens on a populated database", () => {
    const db = openNodeDb();
    db.run(sql`INSERT INTO exercises (id, name, muscle_groups, photos, created_at, updated_at) VALUES ('e1','Squat','["QUADS"]','[]','t','t')`);
    applyMigrations(db);
    expect(db.all(sql`SELECT id FROM exercises`)).toEqual([{ id: "e1" }]);
  });
});
