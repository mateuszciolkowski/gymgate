import { addItem, createPlan, createWorkout, getPlan, updatePlan } from "../db/repositories";
import { outbox, workouts } from "../db/schema";
import { seedExercise, setupWorld } from "../db/testing";
import { discardIssue, groupIssues, listOpenIssues, openIssueCount, retryIssue } from "./issues";
import { markApplied, markRejected, nextBatch } from "./outbox";

const at = "2026-01-01T12:00:00.000Z";

describe("sync issues", () => {
  it("discard with no server version deletes the local record (cascade); other records' ops stay", () => {
    const { db, ctx } = setupWorld();
    seedExercise(db, "ex", "E");
    const w = createWorkout(ctx);
    addItem(ctx, w.id, "ex");
    const [create] = nextBatch(db);
    markRejected(db, create!.opId, { code: "stale_start", error: "too old" }, at);
    expect(openIssueCount(db)).toBe(1);
    discardIssue(db, listOpenIssues(db)[0]!.id);
    expect(db.select().from(workouts).all()).toHaveLength(0);
    expect(openIssueCount(db)).toBe(0);
    expect(db.select().from(outbox).all().map((o) => o.type)).toEqual(["item.add"]); // will be rejected as not_found and grouped
  });

  it("discard with a server version restores it, dropping the local edit", () => {
    const { db, ctx } = setupWorld();
    seedExercise(db, "ex", "E");
    seedExercise(db, "ex2", "E2");
    const plan = createPlan(ctx, { name: "Plan A", exerciseIds: ["ex"], isPublic: false });
    updatePlan(ctx, plan.id, { name: "Plan B", exerciseIds: ["ex", "ex2"] });
    const [created, update] = nextBatch(db);
    markApplied(db, [created!.opId]); // already on the server
    const server = { id: plan.id, name: "Plan A", shortName: null, creatorUserId: "u1", isPublic: false, createdAt: at, updatedAt: at, items: [{ id: "pi", planId: plan.id, exerciseId: "ex", orderInPlan: 1 }] };
    markRejected(db, update.opId, { code: "conflict", error: "Nazwa zajęta", current: server }, at);
    discardIssue(db, listOpenIssues(db)[0]!.id);
    const restored = getPlan(db, plan.id)!;
    expect(restored.name).toBe("Plan A");
    expect(restored.items.map((i) => i.exerciseId)).toEqual(["ex"]);
    expect(nextBatch(db)).toHaveLength(0);
  });

  it("retry after edit queues the op again under a new opId with the patch merged", () => {
    const { db, ctx } = setupWorld();
    seedExercise(db, "ex", "E");
    const plan = createPlan(ctx, { name: "Zajęta", exerciseIds: ["ex"], isPublic: false });
    const [create] = nextBatch(db);
    markRejected(db, create!.opId, { code: "conflict", error: "Nazwa zajęta", current: null }, at);
    retryIssue(ctx, listOpenIssues(db)[0]!.id, { name: "Wolna" });
    const [again] = nextBatch(db);
    expect(again!.opId).not.toBe(create!.opId);
    expect(JSON.parse(again!.payload)).toMatchObject({ type: "plan.create", id: plan.id, name: "Wolna" });
    expect(openIssueCount(db)).toBe(0);
    expect(db.select().from(outbox).all()).toHaveLength(1);
  });
});

describe("groupIssues", () => {
  const issue = (entity: string, code: string, current: string | null, n: number) =>
    ({ id: n, opId: `o${n}`, type: "x", entity, entityId: "e", payload: "{}", code, error: `err${n}`, current, status: "open", createdAt: "" }) as never;

  it("collapses not_found rejections of deleted records into one message per subject", () => {
    const groups = groupIssues([issue("set", "not_found", null, 1), issue("item", "not_found", null, 2), issue("set", "not_found", null, 3), issue("plan", "conflict", "{}", 4)]);
    expect(groups).toHaveLength(2);
    const del = groups.find((g) => g.kind === "parentDeleted")!;
    expect(del.subject).toBe("workout");
    expect(del.issues).toHaveLength(3);
    expect(del.message).toBe("Trening został usunięty na innym urządzeniu; 3 niewysłane zmiany pominięto");
    expect(groups.find((g) => g.kind === "single")!.message).toBe("err4");
  });
});
