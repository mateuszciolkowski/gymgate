import { eq } from "drizzle-orm";
import { openNodeDb } from "../db/testing";
import { syncIssues } from "../db/schema";
import { enqueue, hasPendingOpFor, markApplied, markAttempt, markRejected, nextBatch, pendingCount } from "./outbox";
import { makeClock, recordServerTime } from "./clock";

const op = (n: number, entity: "workout" | "set" = "workout", entityId = `e${n}`) => ({
  opId: `op${n}`,
  type: "workout.delete",
  at: "2026-01-01T10:00:00.000Z",
  entity,
  entityId,
  fields: { id: entityId },
});

describe("outbox", () => {
  it("enqueues the flat wire payload and returns pending ops in seq order, max 100", () => {
    const db = openNodeDb();
    for (let i = 1; i <= 120; i++) db.transaction((tx) => enqueue(tx, op(i)));
    const batch = nextBatch(db);
    expect(batch).toHaveLength(100);
    expect(batch.map((b) => b.opId)).toEqual(Array.from({ length: 100 }, (_, i) => `op${i + 1}`));
    expect(JSON.parse(batch[0]!.payload)).toEqual({ opId: "op1", type: "workout.delete", at: "2026-01-01T10:00:00.000Z", id: "e1" });
    expect(nextBatch(db, 5)).toHaveLength(5);
    expect(pendingCount(db)).toBe(120);
  });

  it("enqueue joins the caller's transaction (rollback removes it)", () => {
    const db = openNodeDb();
    expect(() =>
      db.transaction((tx) => {
        enqueue(tx, op(1));
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(pendingCount(db)).toBe(0);
  });

  it("markApplied deletes the ops", () => {
    const db = openNodeDb();
    for (let i = 1; i <= 3; i++) db.transaction((tx) => enqueue(tx, op(i)));
    markApplied(db, ["op1", "op3"]);
    expect(nextBatch(db).map((b) => b.opId)).toEqual(["op2"]);
  });

  it("markRejected keeps the op as rejected, opens an issue and leaves the rest of the queue sendable", () => {
    const db = openNodeDb();
    for (let i = 1; i <= 2; i++) db.transaction((tx) => enqueue(tx, op(i)));
    markRejected(db, "op1", { code: "conflict", error: "Plan with this name already exists", current: { id: "x" } }, "2026-01-02T00:00:00.000Z");
    expect(nextBatch(db).map((b) => b.opId)).toEqual(["op2"]);
    expect(pendingCount(db)).toBe(1);
    const issues = db.select().from(syncIssues).where(eq(syncIssues.opId, "op1")).all();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "conflict", status: "open", entity: "workout", entityId: "e1", current: '{"id":"x"}' });
    expect(JSON.parse(issues[0]!.payload).type).toBe("workout.delete");
  });

  it("hasPendingOpFor sees only pending ops of that entity", () => {
    const db = openNodeDb();
    db.transaction((tx) => {
      enqueue(tx, op(1, "workout", "w1"));
      enqueue(tx, op(2, "set", "w1"));
    });
    expect(hasPendingOpFor(db, "workout", "w1")).toBe(true);
    expect(hasPendingOpFor(db, "workout", "w2")).toBe(false);
    markRejected(db, "op1", { error: "x" }, "t");
    expect(hasPendingOpFor(db, "workout", "w1")).toBe(false);
    expect(hasPendingOpFor(db, "set", "w1")).toBe(true);
  });

  it("markAttempt counts attempts and keeps the error", () => {
    const db = openNodeDb();
    db.transaction((tx) => enqueue(tx, op(1)));
    markAttempt(db, ["op1"], "Timeout");
    markAttempt(db, ["op1"], "Network");
    expect(nextBatch(db)[0]).toMatchObject({ attempts: 2, lastError: "Network" });
  });
});

describe("clock", () => {
  it("is device time until a server time is recorded, then shifted by the offset", () => {
    const db = openNodeDb();
    const clock = makeClock(db, () => Date.parse("2026-01-01T10:00:00.000Z"));
    expect(clock()).toBe("2026-01-01T10:00:00.000Z");
    recordServerTime(db, "2026-01-01T10:00:05.000Z", Date.parse("2026-01-01T10:00:00.000Z"));
    expect(clock()).toBe("2026-01-01T10:00:05.000Z");
    recordServerTime(db, "2026-01-01T09:59:00.000Z", Date.parse("2026-01-01T10:00:00.000Z"));
    expect(clock()).toBe("2026-01-01T09:59:00.000Z");
  });
});
