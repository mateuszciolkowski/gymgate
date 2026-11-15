import { eq } from "drizzle-orm";
import { exercises, pendingNotes, planItems, plans, profile, syncState, workoutItems, workoutSets, workouts } from "../db/schema";
import { addItem, createWorkout, updateWorkout } from "../db/repositories";
import { seedExercise, setupWorld } from "../db/testing";
import { pullAll } from "./pull";
import { emptyPull, fakeApi } from "./testApi";

const W = "11111111-1111-4111-8111-111111111111";
const stamp = "2026-01-01T09:00:00.000Z";
const wRow = (id: string, over: object = {}) => ({
  id, userId: "u1", workoutDate: stamp, status: "COMPLETED" as const, workoutName: "srv", gymName: null, location: null, workoutNotes: null,
  durationSeconds: 60, workoutPlanId: null, skippedPlanExerciseIds: [], createdAt: stamp, updatedAt: stamp, ...over,
});
const prof = { id: "u1", email: "t@t.pl", firstName: "T", lastName: "T", phone: null, isAdmin: false, activeWorkoutId: W };
const cursorOf = (db: ReturnType<typeof setupWorld>["db"]) => db.select().from(syncState).get()?.cursor ?? null;

describe("pullAll snapshot", () => {
  it("pages through snapshotTokens, stores the cursor only after the last page, in the same transaction as the data", async () => {
    const { db } = setupWorld();
    const pages = [
      emptyPull({ cursor: "c-snap", hasMore: true, snapshotToken: "t1", upserts: { ...emptyPull().upserts, workouts: [wRow("a")], profile: prof } }),
      emptyPull({ cursor: "c-snap", hasMore: false, upserts: { ...emptyPull().upserts, workouts: [wRow("b")] } }),
    ];
    let n = 0;
    const api = fakeApi((c) => {
      if (n === 1) expect(cursorOf(db)).toBeNull(); // not stored after page 1
      if (n === 1) expect(c.path).toBe("/api/sync/pull?snapshotToken=t1");
      return pages[n++];
    });
    const out = await pullAll({ db, api });
    expect(out).toEqual({ snapshot: true, pages: 2 });
    expect(cursorOf(db)).toBe("c-snap");
    expect(db.select().from(syncState).get()?.initialPullAt).not.toBeNull();
    expect(db.select().from(workouts).all().map((w) => w.id).sort()).toEqual(["a", "b"]);
  });

  it("a failing last page stores no cursor and no data of that page (atomic)", async () => {
    const { db } = setupWorld();
    const bad = emptyPull({ upserts: { ...emptyPull().upserts, workouts: [wRow("a"), { ...wRow("b"), createdAt: null as unknown as string }] } });
    await expect(pullAll({ db, api: fakeApi(() => bad) })).rejects.toThrow();
    expect(cursorOf(db)).toBeNull();
    expect(db.select().from(workouts).all()).toHaveLength(0);
  });

  it("removes local rows the server no longer has, except rows with unsent ops", async () => {
    const { db, ctx } = setupWorld();
    seedExercise(db, "ex-gone", "Gone");
    seedExercise(db, "ex-keep", "Keep");
    db.insert(workouts).values(wRow("old")).run();
    db.insert(workoutItems).values({ id: "i-old", workoutId: "old", exerciseId: "ex-keep", orderInWorkout: 1, notes: null, previousNote: null, createdAt: stamp, updatedAt: stamp }).run();
    db.insert(workoutSets).values({ id: "s-old", itemId: "i-old", setNumber: 1, weight: "50", repetitions: 5, createdAt: stamp, updatedAt: stamp }).run();
    const local = createWorkout(ctx, { workoutName: "local only" });
    const snap = emptyPull({ upserts: { ...emptyPull().upserts, exercises: [{ id: "ex-keep", name: "Keep", muscleGroups: ["CHEST"], description: null, creatorUserId: null, photos: [], createdAt: stamp, updatedAt: stamp }] } });
    await pullAll({ db, api: fakeApi(() => snap) });
    expect(db.select().from(workouts).all().map((w) => w.id)).toEqual([local.id]);
    expect(db.select().from(workoutItems).all()).toHaveLength(0);
    expect(db.select().from(workoutSets).all()).toHaveLength(0);
    expect(db.select().from(exercises).all().map((e) => e.id)).toEqual(["ex-keep"]);
  });
});

describe("pullAll incremental", () => {
  const seeded = async () => {
    const w = setupWorld();
    await pullAll({ db: w.db, api: fakeApi(() => emptyPull({ cursor: "c0" })) });
    return w;
  };

  it("follows hasMore with the returned cursor and applies each response with its cursor", async () => {
    const { db } = await seeded();
    const seen: string[] = [];
    const api = fakeApi((c) => {
      seen.push(c.path);
      return seen.length === 1
        ? emptyPull({ cursor: "c1", hasMore: true, upserts: { ...emptyPull().upserts, workouts: [wRow("a")] } })
        : emptyPull({ cursor: "c2", upserts: { ...emptyPull().upserts, workouts: [wRow("b")] } });
    });
    await pullAll({ db, api });
    expect(seen).toEqual(["/api/sync/pull?cursor=c0", "/api/sync/pull?cursor=c1"]);
    expect(cursorOf(db)).toBe("c2");
    expect(db.select().from(workouts).all()).toHaveLength(2);
  });

  it("skips a record with an unsent op (local wins) but applies others", async () => {
    const { db, ctx } = await seeded();
    const w = createWorkout(ctx, { workoutName: "mine" });
    updateWorkout(ctx, w.id, { workoutName: "mine 2" });
    const api = fakeApi(() => emptyPull({ cursor: "c1", upserts: { ...emptyPull().upserts, workouts: [wRow(w.id, { workoutName: "server" }), wRow("other")] } }));
    await pullAll({ db, api });
    expect(db.select().from(workouts).where(eq(workouts.id, w.id)).get()?.workoutName).toBe("mine 2");
    expect(db.select().from(workouts).where(eq(workouts.id, "other")).get()).toBeDefined();
  });

  it("derived data (pending notes, activeWorkoutId) only with an empty outbox", async () => {
    const { db, ctx } = await seeded();
    seedExercise(db, "ex1", "E");
    const data = emptyPull({ cursor: "c1", upserts: { ...emptyPull().upserts, pendingNotes: [{ exerciseId: "ex1", note: "n", updatedAt: stamp }], profile: prof } });
    const w = createWorkout(ctx);
    await pullAll({ db, api: fakeApi(() => data) });
    expect(db.select().from(pendingNotes).all()).toHaveLength(0);
    expect(db.select().from(profile).get()?.activeWorkoutId).toBe(w.id);
    const { db: db2 } = await seeded();
    await pullAll({ db: db2, api: fakeApi(() => data) });
    expect(db2.select().from(pendingNotes).get()?.note).toBe("n");
    expect(db2.select().from(profile).get()?.activeWorkoutId).toBe(W);
  });

  it("applies deletes with local cascades (workout, exercise, plan, pending note)", async () => {
    const { db } = await seeded();
    seedExercise(db, "ex1", "E");
    db.insert(workouts).values(wRow("w1")).run();
    db.insert(workoutItems).values({ id: "i1", workoutId: "w1", exerciseId: "ex1", orderInWorkout: 1, notes: null, previousNote: null, createdAt: stamp, updatedAt: stamp }).run();
    db.insert(workoutSets).values({ id: "s1", itemId: "i1", setNumber: 1, weight: "1", repetitions: 1, createdAt: stamp, updatedAt: stamp }).run();
    db.insert(plans).values({ id: "p1", name: "Plan", shortName: null, creatorUserId: "u1", isPublic: false, isFavorite: false, createdAt: stamp, updatedAt: stamp }).run();
    db.insert(planItems).values({ id: "pi1", planId: "p1", exerciseId: "ex1", orderInPlan: 1 }).run();
    db.insert(workouts).values(wRow("w2", { workoutPlanId: "p1" })).run();
    db.insert(pendingNotes).values({ id: "ex1", exerciseId: "ex1", note: "x", updatedAt: stamp }).run();
    const del = (entity: string, id: string) => ({ entity, id }) as never;
    await pullAll({ db, api: fakeApi(() => emptyPull({ cursor: "c1", deletes: [del("workout", "w1"), del("plan", "p1"), del("pendingNote", "ex1")] })) });
    expect(db.select().from(workoutItems).all()).toHaveLength(0);
    expect(db.select().from(workoutSets).all()).toHaveLength(0);
    expect(db.select().from(planItems).all()).toHaveLength(0);
    expect(db.select().from(pendingNotes).all()).toHaveLength(0);
    expect(db.select().from(workouts).where(eq(workouts.id, "w2")).get()?.workoutPlanId).toBeNull();
    await pullAll({ db, api: fakeApi(() => emptyPull({ cursor: "c2", deletes: [del("exercise", "ex1")] })) });
    expect(db.select().from(exercises).all()).toHaveLength(0);
  });

  it("a delete wins over unsent ops: the row goes away, the op stays to be rejected", async () => {
    const { db, ctx } = await seeded();
    seedExercise(db, "ex1", "E");
    const w = createWorkout(ctx);
    addItem(ctx, w.id, "ex1");
    await pullAll({ db, api: fakeApi(() => emptyPull({ cursor: "c1", deletes: [{ entity: "workout", id: w.id }] })) });
    expect(db.select().from(workouts).all()).toHaveLength(0);
    expect(db.select().from(workoutItems).all()).toHaveLength(0);
  });

  it("resyncRequired starts a snapshot and keeps the outbox", async () => {
    const { db, ctx } = await seeded();
    const w = createWorkout(ctx);
    const paths: string[] = [];
    const api = fakeApi((c) => {
      paths.push(c.path);
      return c.path.includes("cursor=") ? emptyPull({ cursor: null, resyncRequired: true }) : emptyPull({ cursor: "fresh" });
    });
    const out = await pullAll({ db, api });
    expect(out.snapshot).toBe(true);
    expect(paths).toEqual(["/api/sync/pull?cursor=c0", "/api/sync/pull"]);
    expect(cursorOf(db)).toBe("fresh");
    expect(db.select().from(workouts).where(eq(workouts.id, w.id)).get()).toBeDefined(); // pending create survived the prune
  });
});
