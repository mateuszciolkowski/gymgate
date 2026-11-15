import { count, eq } from "drizzle-orm";
import { operationSchema } from "../../sync/wireFixture";
import { ValidationError } from "../../domain/validation";
import { outbox, pendingNotes, planItems, plans, workoutItems, workoutSets, workouts } from "../schema";
import { outboxOps, seedExercise, setupWorld, testCtx } from "../testing";
import type { Ctx } from "../types";
import {
  addItem,
  addSet,
  completeWorkout,
  createExercise,
  createPlan,
  createWorkout,
  deleteExercise,
  deleteItem,
  deletePlan,
  deleteSet,
  deleteWorkout,
  duplicatePlan,
  exerciseDeleteImpact,
  getActiveWorkout,
  getActiveWorkoutId,
  getPendingNote,
  getPlan,
  getProfile,
  getWorkout,
  listPlans,
  listWorkouts,
  setPlanFavorite,
  skipPlanExercise,
  updateExercise,
  updateItemNotes,
  updatePlan,
  updateSet,
  updateWorkout,
} from "./index";

const EX_A = "aaaaaaaa-0000-4000-8000-000000000001";
const EX_B = "aaaaaaaa-0000-4000-8000-000000000002";
const EX_PRIVATE = "aaaaaaaa-0000-4000-8000-000000000003";

function world(opts: { isAdmin?: boolean } = {}) {
  const w = setupWorld(opts);
  seedExercise(w.db, EX_A, "Bench", null);
  seedExercise(w.db, EX_B, "Squat", "1");
  seedExercise(w.db, EX_PRIVATE, "Mine", w.ctx.userId);
  return w;
}

const countOf = (db: Ctx["db"], t: typeof outbox | typeof workouts | typeof workoutItems | typeof workoutSets | typeof plans | typeof planItems | typeof pendingNotes) =>
  db.select({ n: count() }).from(t).get()!.n;

/** Every queued payload must satisfy the backend's push schema (wireFixture = copy of sync.schema.ts). */
function expectWireValid(db: Ctx["db"]) {
  for (const op of outboxOps(db)) {
    const r = operationSchema.safeParse(op);
    expect({ type: op.type, ok: r.success, issues: r.success ? [] : r.error.issues }).toEqual({ type: op.type, ok: true, issues: [] });
  }
}

describe("workout actions", () => {
  it("createWorkout: row + pointer + workout.create op in one go; older draft stays a draft", () => {
    const { db, ctx } = world();
    const first = createWorkout(ctx, { workoutName: "Push", gymName: "" });
    const second = createWorkout(ctx, {});
    expect(getActiveWorkoutId(db)).toBe(second.id);
    expect(getWorkout(db, first.id)?.status).toBe("DRAFT");
    expect(getWorkout(db, first.id)?.gymName).toBeNull();
    const ops = outboxOps(db);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ type: "workout.create", id: first.id, workoutName: "Push", startedAt: first.createdAt });
    expect(ops[0]).not.toHaveProperty("gymName");
    expectWireValid(db);
  });

  it("createWorkout with a plan stores the reference and sends workoutPlanId", () => {
    const { db, ctx } = world();
    const plan = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false });
    const w = createWorkout(ctx, { workoutPlanId: plan.id });
    expect(getWorkout(db, w.id)?.workoutPlanId).toBe(plan.id);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "workout.create", workoutPlanId: plan.id });
    expectWireValid(db);
  });

  it("updateWorkout sends only changed fields and clears empty text to null", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, { workoutName: "Old" });
    updateWorkout(ctx, w.id, { workoutName: "", durationSeconds: 90, workoutNotes: "n" });
    expect(getWorkout(db, w.id)).toMatchObject({ workoutName: null, durationSeconds: 90, workoutNotes: "n" });
    expect(outboxOps(db).at(-1)).toEqual(expect.objectContaining({ type: "workout.update", id: w.id, workoutName: null, durationSeconds: 90, workoutNotes: "n" }));
    expect(outboxOps(db).at(-1)).not.toHaveProperty("gymName");
    expectWireValid(db);
  });

  it("completeWorkout enforces the completion rule, completes, clears the pointer and queues workout.complete", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    expect(() => completeWorkout(ctx, w.id, 100)).toThrow("Dodaj przynajmniej jedno ćwiczenie przed zakończeniem treningu.");
    const item = addItem(ctx, w.id, EX_A);
    expect(() => completeWorkout(ctx, w.id, 100)).toThrow('Ćwiczenie "Bench" nie ma żadnych serii. Dodaj serię lub usuń to ćwiczenie.');
    addSet(ctx, item.id, { weight: 60, repetitions: 5 });
    completeWorkout(ctx, w.id, 3600);
    expect(getWorkout(db, w.id)).toMatchObject({ status: "COMPLETED", durationSeconds: 3600 });
    expect(getActiveWorkoutId(db)).toBeNull();
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "workout.complete", id: w.id, durationSeconds: 3600 });
    expectWireValid(db);
  });

  it("completeWorkout force skips the rule (abandoned workout, D-24); completing twice queues nothing new", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    completeWorkout(ctx, w.id, 10, { force: true });
    const n = countOf(db, outbox);
    completeWorkout(ctx, w.id, 10);
    expect(countOf(db, outbox)).toBe(n);
  });

  it("completing an older draft does not drop the newer active workout", () => {
    const { db, ctx } = world();
    const older = createWorkout(ctx, {});
    const newer = createWorkout(ctx, {});
    completeWorkout(ctx, older.id, 5, { force: true });
    expect(getActiveWorkoutId(db)).toBe(newer.id);
  });

  it("deleteWorkout cascades items and sets, clears the pointer", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    addSet(ctx, item.id, { weight: 10, repetitions: 1 });
    deleteWorkout(ctx, w.id);
    expect([countOf(db, workouts), countOf(db, workoutItems), countOf(db, workoutSets)]).toEqual([0, 0, 0]);
    expect(getProfile(db)?.activeWorkoutId).toBeNull();
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "workout.delete", id: w.id });
    expectWireValid(db);
  });

  it("getActiveWorkout self-heals a pointer to a completed or missing workout", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    db.update(workouts).set({ status: "COMPLETED" }).where(eq(workouts.id, w.id)).run();
    expect(getActiveWorkout(db)).toBeNull();
    expect(getProfile(db)?.activeWorkoutId).toBeNull();
  });

  it("listWorkouts: newest date first, same-day ties by creation, items and sets hydrated", () => {
    const { db, ctx } = world();
    const a = createWorkout(ctx, { workoutDate: "2026-02-01T00:00:00.000Z" });
    const b = createWorkout(ctx, { workoutDate: "2026-02-01T00:00:00.000Z" });
    const c = createWorkout(ctx, { workoutDate: "2026-03-01T00:00:00.000Z" });
    const item = addItem(ctx, a.id, EX_A);
    addSet(ctx, item.id, { weight: 20, repetitions: 3 });
    const list = listWorkouts(db);
    expect(list.map((x) => x.id)).toEqual([c.id, b.id, a.id]);
    expect(list[2]!.items[0]).toMatchObject({ exercise: { name: "Bench" }, sets: [{ weight: "20", repetitions: 3 }] });
    expect(listWorkouts(db, { status: "COMPLETED" })).toEqual([]);
    expect(listWorkouts(db, { limit: 1 })).toHaveLength(1);
  });
});

describe("items, sets and pending notes", () => {
  it("addItem creates an item with NO sets, order = max + 1, item.add op", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const i1 = addItem(ctx, w.id, EX_A);
    const i2 = addItem(ctx, w.id, EX_B);
    expect([i1.orderInWorkout, i2.orderInWorkout]).toEqual([1, 2]);
    expect(countOf(db, workoutSets)).toBe(0);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "item.add", id: i2.id, workoutId: w.id, exerciseId: EX_B, orderInWorkout: 2 });
    expectWireValid(db);
  });

  it("notes change upserts the pending note (trimmed), empty note clears it", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    updateItemNotes(ctx, item.id, "  heavy  ");
    expect(getPendingNote(db, EX_A)).toBe("heavy");
    updateItemNotes(ctx, item.id, "   ");
    expect(getPendingNote(db, EX_A)).toBeNull();
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "item.update", id: item.id, notes: "   " });
    expectWireValid(db);
  });

  it("carry-over: completing stores the note, adding the exercise consumes it into previousNote", () => {
    const { db, ctx } = world();
    const w1 = createWorkout(ctx, {});
    const item = addItem(ctx, w1.id, EX_A);
    addSet(ctx, item.id, { weight: 50, repetitions: 5 });
    db.update(workoutItems).set({ notes: "go slower" }).where(eq(workoutItems.id, item.id)).run(); // set without the notes action
    expect(getPendingNote(db, EX_A)).toBeNull();
    completeWorkout(ctx, w1.id, 60);
    expect(getPendingNote(db, EX_A)).toBe("go slower");

    const w2 = createWorkout(ctx, {});
    const item2 = addItem(ctx, w2.id, EX_A);
    expect(item2.previousNote).toBe("go slower");
    expect(getPendingNote(db, EX_A)).toBeNull();
    expect(countOf(db, pendingNotes)).toBe(0);
    const item3 = addItem(ctx, w2.id, EX_B);
    expect(item3.previousNote).toBeNull();
  });

  it("deleteItem removes its sets", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    addSet(ctx, item.id, { weight: 1, repetitions: 1 });
    deleteItem(ctx, item.id);
    expect([countOf(db, workoutItems), countOf(db, workoutSets)]).toEqual([0, 0]);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "item.delete", id: item.id });
    expectWireValid(db);
  });

  it("addSet numbers sets max + 1, normalizes the weight, validates", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    const s1 = addSet(ctx, item.id, { weight: "62.50", repetitions: 5 });
    const s2 = addSet(ctx, item.id, { weight: 0, repetitions: 1 });
    expect([s1.setNumber, s1.weight, s2.setNumber, s2.weight]).toEqual([1, "62.5", 2, "0"]);
    expect(() => addSet(ctx, item.id, { weight: -1, repetitions: 5 })).toThrow(ValidationError);
    expect(() => addSet(ctx, item.id, { weight: 10, repetitions: 0 })).toThrow("Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)");
    expect(() => addSet(ctx, item.id, { weight: 10.25, repetitions: 5 })).toThrow(ValidationError);
    expect(countOf(db, workoutSets)).toBe(2);
    expect(outboxOps(db).filter((o) => o.type === "set.add")[0]).toMatchObject({ id: s1.id, itemId: item.id, setNumber: 1, weight: "62.5", repetitions: 5 });
    expectWireValid(db);
  });

  it("updateSet / deleteSet", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    const s = addSet(ctx, item.id, { weight: 10, repetitions: 5 });
    updateSet(ctx, s.id, { repetitions: 8 });
    expect(getWorkout(db, w.id)?.items[0]?.sets[0]).toMatchObject({ weight: "10", repetitions: 8 });
    expect(outboxOps(db).at(-1)).toEqual(expect.objectContaining({ type: "set.update", id: s.id, repetitions: 8 }));
    expect(outboxOps(db).at(-1)).not.toHaveProperty("weight");
    deleteSet(ctx, s.id);
    expect(countOf(db, workoutSets)).toBe(0);
    expectWireValid(db);
  });

  it("skipPlanExercise: validates, appends once, queues one op", () => {
    const { db, ctx } = world();
    const plan = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A, EX_B], isPublic: false });
    const w = createWorkout(ctx, { workoutPlanId: plan.id });
    const plain = createWorkout(ctx, {});
    expect(() => skipPlanExercise(ctx, plain.id, EX_A)).toThrow("Trening nie jest powiązany z planem");
    expect(() => skipPlanExercise(ctx, w.id, EX_PRIVATE)).toThrow("Ćwiczenie nie należy do planu tego treningu");
    skipPlanExercise(ctx, w.id, EX_A);
    const before = countOf(db, outbox);
    skipPlanExercise(ctx, w.id, EX_A);
    expect(countOf(db, outbox)).toBe(before);
    expect(getWorkout(db, w.id)?.skippedPlanExerciseIds).toEqual([EX_A]);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "workout.skipPlanExercise", id: w.id, exerciseId: EX_A });
    expectWireValid(db);
  });
});

describe("exercises", () => {
  it("create / update / delete with ops, permissions and validation", () => {
    const { db, ctx } = world();
    expect(() => createExercise(ctx, { name: " ", muscleGroups: ["CHEST"] })).toThrow("Nazwa ćwiczenia jest wymagana");
    expect(() => createExercise(ctx, { name: "X", muscleGroups: [] })).toThrow("Wybierz przynajmniej jedną grupę mięśniową");
    expect(() => createExercise(ctx, { name: "X", muscleGroups: ["CHEST"], isGlobal: true })).toThrow("Brak uprawnień do tworzenia globalnych ćwiczeń");
    const e = createExercise(ctx, { name: " Row ", muscleGroups: ["BACK"], description: "d" });
    expect(e).toMatchObject({ name: "Row", creatorUserId: ctx.userId });
    updateExercise(ctx, e.id, { description: null, name: "Row 2" });
    expect(() => updateExercise(ctx, EX_A, { name: "Hack" })).toThrow("Unauthorized: You can only edit your own exercises");
    deleteExercise(ctx, e.id);
    expect(outboxOps(db).map((o) => o.type)).toEqual(["exercise.create", "exercise.update", "exercise.delete"]);
    expect(outboxOps(db)[1]).toMatchObject({ name: "Row 2", description: null });
    expectWireValid(db);
  });

  it("admin creates global exercises (creator null, isGlobal on the wire)", () => {
    const { db, ctx } = world({ isAdmin: true });
    const e = createExercise(ctx, { name: "Global", muscleGroups: ["ABS"], isGlobal: true });
    expect(e.creatorUserId).toBeNull();
    expect(outboxOps(db)[0]).toMatchObject({ isGlobal: true });
    expectWireValid(db);
  });

  it("delete cascades: workout items with sets, plan items, pending note; impact is reported first", () => {
    const { db, ctx } = world({ isAdmin: true });
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_B);
    addSet(ctx, item.id, { weight: 5, repetitions: 5 });
    updateItemNotes(ctx, item.id, "note");
    const plan = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_B, EX_PRIVATE], isPublic: false });
    expect(exerciseDeleteImpact(db, EX_B)).toEqual({ workouts: 1, plans: 1 });
    deleteExercise(ctx, EX_B);
    expect([countOf(db, workoutItems), countOf(db, workoutSets), countOf(db, pendingNotes)]).toEqual([0, 0, 0]);
    expect(getPlan(db, plan.id)?.items.map((i) => i.exerciseId)).toEqual([EX_PRIVATE]);
    expect(getWorkout(db, w.id)).not.toBeNull();
  });
});

describe("plans", () => {
  it("create: validations (name, ids, existing exercises, public needs global ones, unique name)", () => {
    const { db, ctx } = world();
    expect(() => createPlan(ctx, { name: "ab", exerciseIds: [EX_A], isPublic: false })).toThrow("Nazwa planu musi mieć co najmniej 3 znaki");
    expect(() => createPlan(ctx, { name: "Plan A", exerciseIds: [], isPublic: false })).toThrow("Dodaj co najmniej 1 ćwiczenie");
    expect(() => createPlan(ctx, { name: "Plan A", exerciseIds: ["nope"], isPublic: false })).toThrow("Exercises not found: nope");
    expect(() => createPlan(ctx, { name: "Plan A", exerciseIds: [EX_PRIVATE], isPublic: true })).toThrow("Cannot make plan public: contains private exercises (Mine)");
    expect(() => createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false, isGlobal: true })).toThrow("Only admins can create global plans");
    createPlan(ctx, { name: "Plan A", shortName: "PA", exerciseIds: [EX_A, EX_B], isPublic: true });
    expect(() => createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false })).toThrow("Plan with this name already exists");
    expect(countOf(db, plans)).toBe(1);
    expect(getPlan(db, outboxOps(db)[0]!.id as string)?.items.map((i) => [i.exerciseId, i.orderInPlan])).toEqual([[EX_A, 0], [EX_B, 1]]);
    expect(outboxOps(db)).toHaveLength(1);
    expect(outboxOps(db)[0]).toMatchObject({ type: "plan.create", name: "Plan A", shortName: "PA", exerciseIds: [EX_A, EX_B], isPublic: true });
    expectWireValid(db);
  });

  it("update replaces items, checks name and public rules, sends only changed fields", () => {
    const { db, ctx } = world();
    const p = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false });
    createPlan(ctx, { name: "Plan B", exerciseIds: [EX_A], isPublic: false });
    expect(() => updatePlan(ctx, p.id, { name: "Plan B" })).toThrow("Plan with this name already exists");
    updatePlan(ctx, p.id, { exerciseIds: [EX_PRIVATE, EX_A] });
    expect(() => updatePlan(ctx, p.id, { isPublic: true })).toThrow("Cannot make plan public");
    updatePlan(ctx, p.id, { name: "Plan A2", shortName: null });
    expect(getPlan(db, p.id)).toMatchObject({ name: "Plan A2", shortName: null });
    expect(getPlan(db, p.id)?.items.map((i) => i.exerciseId)).toEqual([EX_PRIVATE, EX_A]);
    expect(outboxOps(db).at(-1)).toEqual(expect.objectContaining({ type: "plan.update", name: "Plan A2", shortName: null }));
    expect(outboxOps(db).at(-1)).not.toHaveProperty("exerciseIds");
    expectWireValid(db);
  });

  it("delete cascades items; workouts keep existing and lose workoutPlanId", () => {
    const { db, ctx } = world();
    const p = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false });
    const w = createWorkout(ctx, { workoutPlanId: p.id });
    deletePlan(ctx, p.id);
    expect(countOf(db, plans) + countOf(db, planItems)).toBe(0);
    expect(getWorkout(db, w.id)?.workoutPlanId).toBeNull();
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "plan.delete", id: p.id });
    expectWireValid(db);
  });

  it("duplicate names the copy '(kopia)', '(kopia 2)', private, items in order", () => {
    const { db, ctx } = world();
    const p = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_B, EX_A], isPublic: true });
    const c1 = duplicatePlan(ctx, p.id);
    const c2 = duplicatePlan(ctx, p.id);
    expect([c1.name, c2.name]).toEqual(["Plan A (kopia)", "Plan A (kopia 2)"]);
    expect(c1).toMatchObject({ isPublic: false, creatorUserId: ctx.userId });
    expect(c1.items.map((i) => i.exerciseId)).toEqual([EX_B, EX_A]);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "plan.duplicate", id: c2.id, sourceId: p.id, name: "Plan A (kopia 2)" });
    expectWireValid(db);
  });

  it("favorite / unfavorite queue ops only on change; tabs and picker list the right plans", () => {
    const { db, ctx } = world();
    const mine = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false });
    db.insert(plans).values({ id: "p-built", name: "Built", shortName: null, creatorUserId: null, isPublic: true, isFavorite: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "t" }).run();
    db.insert(plans).values({ id: "p-comm", name: "Comm", shortName: null, creatorUserId: "other", isPublic: true, isFavorite: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "t" }).run();
    db.insert(plans).values({ id: "p-priv", name: "Their private", shortName: null, creatorUserId: "other", isPublic: false, isFavorite: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "t" }).run();
    expect(listPlans(db, "mine", ctx.userId).map((p) => p.id)).toEqual([mine.id]);
    expect(listPlans(db, "builtin", ctx.userId).map((p) => p.id)).toEqual(["p-built"]);
    expect(listPlans(db, "community", ctx.userId).map((p) => p.id)).toEqual(["p-comm"]);
    setPlanFavorite(ctx, mine.id, true);
    setPlanFavorite(ctx, mine.id, true);
    expect(outboxOps(db).filter((o) => o.type === "plan.favorite")).toHaveLength(1);
    setPlanFavorite(ctx, mine.id, false);
    expect(outboxOps(db).at(-1)).toMatchObject({ type: "plan.unfavorite", id: mine.id });
    expectWireValid(db);
  });
});

describe("one action = one transaction", () => {
  // Failing id generation after the data change (the opId is generated last) proves the rollback.
  const failingCtx = (ctx: Ctx, failOnCall: number): Ctx => {
    let calls = 0;
    return {
      ...ctx,
      newId: () => {
        calls += 1;
        if (calls === failOnCall) throw new Error("boom");
        return ctx.newId();
      },
    };
  };

  it("createWorkout: failure after the insert leaves no workout, no pointer change, no op", () => {
    const { db, ctx } = world();
    const before = createWorkout(ctx, {});
    expect(() => createWorkout(failingCtx(ctx, 2), {})).toThrow("boom");
    expect(countOf(db, workouts)).toBe(1);
    expect(countOf(db, outbox)).toBe(1);
    expect(getActiveWorkoutId(db)).toBe(before.id);
  });

  it("addItem: pending note is not consumed when the action fails", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    db.insert(pendingNotes).values({ id: "pn", exerciseId: EX_A, note: "keep", updatedAt: "t" }).run();
    expect(() => addItem(failingCtx(ctx, 2), w.id, EX_A)).toThrow("boom");
    expect(getPendingNote(db, EX_A)).toBe("keep");
    expect(countOf(db, workoutItems)).toBe(0);
    expect(countOf(db, outbox)).toBe(1);
  });

  it("completeWorkout: failure leaves the workout DRAFT, pointer and notes untouched", () => {
    const { db, ctx } = world();
    const w = createWorkout(ctx, {});
    const item = addItem(ctx, w.id, EX_A);
    addSet(ctx, item.id, { weight: 1, repetitions: 1 });
    updateItemNotes(ctx, item.id, "x");
    db.delete(pendingNotes).run();
    const ops = countOf(db, outbox);
    expect(() => completeWorkout(failingCtx(ctx, 2), w.id, 1)).toThrow("boom"); // 1st id = pending note, 2nd = op id
    expect(getWorkout(db, w.id)?.status).toBe("DRAFT");
    expect(getActiveWorkoutId(db)).toBe(w.id);
    expect(countOf(db, pendingNotes)).toBe(0);
    expect(countOf(db, outbox)).toBe(ops);
  });

  it("deletePlan: failure keeps plan, items and the workout's plan reference", () => {
    const { db, ctx } = world();
    const p = createPlan(ctx, { name: "Plan A", exerciseIds: [EX_A], isPublic: false });
    const w = createWorkout(ctx, { workoutPlanId: p.id });
    expect(() => deletePlan(failingCtx(ctx, 1), p.id)).toThrow("boom");
    expect(countOf(db, plans)).toBe(1);
    expect(countOf(db, planItems)).toBe(1);
    expect(getWorkout(db, w.id)?.workoutPlanId).toBe(p.id);
  });

  it("a rejected validation queues nothing", () => {
    const { db, ctx } = world();
    const n = countOf(db, outbox);
    expect(() => createPlan(ctx, { name: "x", exerciseIds: [EX_A], isPublic: false })).toThrow(ValidationError);
    expect(countOf(db, outbox)).toBe(n);
  });
});

describe("timestamps", () => {
  it("every action uses one clock reading for the row and the op", () => {
    const { db } = world();
    const ctx = testCtx(db, "u1", "2026-05-05T08:00:00.000Z");
    const w = createWorkout(ctx, {});
    expect(outboxOps(db)[0]).toMatchObject({ at: w.createdAt, startedAt: w.createdAt });
    expect(w.updatedAt).toBe(w.createdAt);
  });
});
