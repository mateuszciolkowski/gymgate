import { eq } from "drizzle-orm";
import { NetworkError, HttpError } from "../api/errors";
import { syncIssues, workouts } from "../db/schema";
import { setupWorld } from "../db/testing";
import { createWorkout, updateWorkout } from "../db/repositories";
import { getClockOffset } from "./clock";
import { enqueue, nextBatch, pendingCount } from "./outbox";
import { pushAll } from "./push";
import { fakeApi, ok, pushData } from "./testApi";

const now = () => "2026-01-01T12:00:00.000Z";
const op = (n: number) => ({ opId: `op${n}`, type: "workout.delete", at: "2026-01-01T10:00:00.000Z", entity: "workout" as const, entityId: `w${n}`, fields: { id: `w${n}` } });
const queue = (db: ReturnType<typeof setupWorld>["db"], n: number) => {
  for (let i = 1; i <= n; i++) db.transaction((tx) => enqueue(tx, op(i)));
};

describe("pushAll", () => {
  it("sends batches of at most 100 in seq order with the deviceId until the outbox is empty", async () => {
    const { db } = setupWorld();
    queue(db, 230);
    const api = fakeApi((c) => pushData((c.body as { ops: Array<{ opId: string }> }).ops.map((o) => ok(o.opId))));
    const out = await pushAll({ db, api, deviceId: "dev-1", now });
    expect(out.sent).toBe(230);
    const bodies = api.calls.map((c) => c.body as { deviceId: string; ops: Array<{ opId: string }> });
    expect(bodies.map((b) => b.ops.length)).toEqual([100, 100, 30]);
    expect(bodies.every((b) => b.deviceId === "dev-1")).toBe(true);
    expect(bodies[0]!.ops[0]).toEqual({ opId: "op1", type: "workout.delete", at: "2026-01-01T10:00:00.000Z", id: "w1" });
    expect(bodies[1]!.ops[0]!.opId).toBe("op101");
    expect(pendingCount(db)).toBe(0);
  });

  it("removes applied, duplicate and superseded ops; rejected ones become issues and do not block the rest", async () => {
    const { db } = setupWorld();
    queue(db, 4);
    const api = fakeApi(() =>
      pushData([
        { opId: "op1", status: "applied" },
        { opId: "op2", status: "duplicate" },
        { opId: "op3", status: "superseded", current: null },
        { opId: "op4", status: "rejected", code: "conflict", error: "Nazwa zajęta", current: { id: "w4" } },
      ]),
    );
    const out = await pushAll({ db, api, deviceId: "d", now });
    expect(out.rejected).toBe(1);
    expect(nextBatch(db)).toHaveLength(0);
    const issues = db.select().from(syncIssues).all();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ opId: "op4", code: "conflict", error: "Nazwa zajęta", status: "open", createdAt: now() });
    expect(JSON.parse(issues[0]!.current!)).toEqual({ id: "w4" });
  });

  it("superseded: the server version comes back unless another unsent op owns the record", async () => {
    const { db, ctx } = setupWorld();
    const w = createWorkout(ctx, { workoutName: "local" });
    updateWorkout(ctx, w.id, { workoutName: "newer local" });
    const [create, update] = nextBatch(db);
    const server = { ...w, workoutName: "server", items: [] };
    const api = fakeApi(() =>
      pushData([
        { opId: create!.opId, status: "applied" },
        { opId: update!.opId, status: "superseded", current: server },
      ]),
    );
    await pushAll({ db, api, deviceId: "d", now });
    expect(db.select().from(workouts).where(eq(workouts.id, w.id)).get()?.workoutName).toBe("server");
  });

  it("transient failure keeps the whole batch and resends the same opIds; clock offset is recorded", async () => {
    const { db } = setupWorld();
    queue(db, 3);
    let fail = 2;
    const api = fakeApi((c) => {
      if (fail-- > 0) throw fail === 1 ? new NetworkError("down") : new HttpError(503, "busy", null);
      return pushData((c.body as { ops: Array<{ opId: string }> }).ops.map((o) => ok(o.opId)));
    });
    await expect(pushAll({ db, api, deviceId: "d", now })).rejects.toBeInstanceOf(NetworkError);
    await expect(pushAll({ db, api, deviceId: "d", now })).rejects.toBeInstanceOf(HttpError);
    expect(pendingCount(db)).toBe(3);
    await pushAll({ db, api, deviceId: "d", now });
    const ids = api.calls.map((c) => (c.body as { ops: Array<{ opId: string }> }).ops.map((o) => o.opId));
    expect(ids[0]).toEqual(ids[1]);
    expect(ids[1]).toEqual(ids[2]);
    expect(nextBatch(db)).toHaveLength(0);
    expect(getClockOffset(db)).not.toBe(0);
  });

  it("fails loudly when the server answers without results for the sent ops (no endless loop)", async () => {
    const { db } = setupWorld();
    queue(db, 1);
    await expect(pushAll({ db, api: fakeApi(() => pushData([])), deviceId: "d", now })).rejects.toThrow(/no results/);
    expect(pendingCount(db)).toBe(1);
  });
});
