import { randomUUID as uuid } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestExercise, createTestUser, prisma, resetDb, tokenFor } from "../../test/db.js";
import { RETENTION_MS, purgeOldSyncData } from "./sync.pull.service.js";

/**
 * GET /api/sync/pull on a real database. State is created with the OLD endpoints (what the PWA
 * does) and with POST /api/sync/push, and read back through pull.
 */

const app = createApp();

type User = Awaited<ReturnType<typeof createTestUser>>;
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Page {
  cursor: string | null;
  hasMore: boolean;
  resyncRequired: boolean;
  snapshotToken?: string | null;
  upserts: { workouts: Row[]; workoutItems: Row[]; workoutSets: Row[]; exercises: Row[]; plans: Row[]; pendingNotes: Row[]; profile: Row | null };
  deletes: Array<{ entity: string; id: string }>;
  serverTime: string;
}

const auth = (u: User) => ({ Authorization: `Bearer ${tokenFor(u)}` });
const api = {
  get: (u: User, url: string) => request(app).get(url).set(auth(u)),
  post: (u: User, url: string, body: object = {}) => request(app).post(url).set(auth(u)).send(body),
  patch: (u: User, url: string, body: object) => request(app).patch(url).set(auth(u)).send(body),
  put: (u: User, url: string, body: object) => request(app).put(url).set(auth(u)).send(body),
  del: (u: User, url: string) => request(app).delete(url).set(auth(u)),
};

const rawPull = (u: User, qs = "") => api.get(u, `/api/sync/pull${qs}`);
const pullPage = async (u: User, qs = ""): Promise<Page> => {
  const res = await rawPull(u, qs);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(res.body.success).toBe(true);
  return res.body.data;
};

const emptyUpserts = () => ({ workouts: [], workoutItems: [], workoutSets: [], exercises: [], plans: [], pendingNotes: [], profile: null }) as Page["upserts"];
const merge = (into: Page, page: Page) => {
  for (const k of ["workouts", "workoutItems", "workoutSets", "exercises", "plans", "pendingNotes"] as const) {
    into.upserts[k].push(...page.upserts[k]);
  }
  if (page.upserts.profile) into.upserts.profile = page.upserts.profile;
  into.deletes.push(...page.deletes);
};

/** Reads the whole snapshot (all pages). Returns merged rows and the cursor to continue from. */
const snapshotAll = async (u: User) => {
  const out: Page = { cursor: null, hasMore: false, resyncRequired: false, upserts: emptyUpserts(), deletes: [], serverTime: "" };
  let page = await pullPage(u);
  out.cursor = page.cursor;
  merge(out, page);
  while (page.snapshotToken) {
    page = await pullPage(u, `?snapshotToken=${page.snapshotToken}`);
    expect(page.cursor).toBe(out.cursor);
    merge(out, page);
  }
  return out as Page & { cursor: string };
};

/** One incremental pull, following hasMore. */
const incremental = async (u: User, cursor: string) => {
  const out: Page = { cursor, hasMore: false, resyncRequired: false, upserts: emptyUpserts(), deletes: [], serverTime: "" };
  let page: Page;
  do {
    page = await pullPage(u, `?cursor=${out.cursor}`);
    out.cursor = page.cursor;
    merge(out, page);
  } while (page.hasMore);
  return out as Page & { cursor: string };
};

const idsOf = (rows: Row[]) => rows.map((r) => r.id).sort();

// ---- world builders (old endpoints) ----------------------------------------------------

const createWorkout = async (u: User, body: object = {}) => {
  const res = await api.post(u, "/api/workouts", body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as Row;
};
const addExercise = async (u: User, workoutId: string, exerciseId: string) => {
  const res = await api.post(u, `/api/workouts/${workoutId}/exercises`, { exerciseId });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as Row;
};
const addSet = async (u: User, itemId: string, weight = 60, repetitions = 8) => {
  const res = await api.post(u, `/api/workouts/items/${itemId}/sets`, { weight, repetitions });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as Row;
};
const createPlan = async (u: User, name: string, exerciseIds: string[], isPublic = false) => {
  const res = await api.post(u, "/api/plans", { name, exerciseIds, isPublic });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as Row;
};

describe("GET /api/sync/pull", () => {
  let user: User;
  let other: User;

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
    other = await createTestUser();
  });

  describe("kontrakt", () => {
    it("401 bez tokenu", async () => {
      expect((await request(app).get("/api/sync/pull")).status).toBe(401);
    });

    it("400 dla niepoprawnego kursora, tokenu albo obu naraz", async () => {
      expect((await rawPull(user, "?cursor=abc")).status).toBe(400);
      expect((await rawPull(user, "?snapshotToken=abc")).status).toBe(400);
      const page = await pullPage(user);
      expect((await rawPull(user, `?cursor=${page.cursor}&snapshotToken=x`)).status).toBe(400);
    });
  });

  describe("pierwsze pobranie (snapshot)", () => {
    it("zwraca ćwiczenia, plany z pozycjami i ulubionymi, notatki, profil i treningi z pozycjami oraz seriami", async () => {
      const global = await createTestExercise(null, "Globalne");
      await createTestUser({ id: "1" }); // legacy "global" creator
      const legacyGlobal = await createTestExercise("1", "Historyczne globalne");
      const mine = await createTestExercise(user.id, "Moje");
      const foreignPrivate = await createTestExercise(other.id, "Cudze prywatne");

      const builtin = await prisma.workoutPlan.create({
        data: { name: "Wbudowany", creatorUserId: null, isPublic: true, items: { create: [{ exerciseId: global.id, orderInPlan: 1 }] } },
      });
      const foreignPublic = await createPlan(other, "Publiczny obcy", [global.id], true);
      await createPlan(other, "Prywatny obcy", [global.id], false);
      const ownPlan = await createPlan(user, "Mój plan", [mine.id, global.id]);
      await api.post(user, `/api/plans/${foreignPublic.id}/favorite`);

      const workout = await createWorkout(user, { workoutName: "Push", gymName: "Siłka" });
      const item = await addExercise(user, workout.id, global.id);
      await addSet(user, item.id, 62.5, 7);
      await api.patch(user, `/api/workouts/items/${item.id}`, { notes: "uwaga" });
      await createWorkout(other);

      const snap = await snapshotAll(user);

      expect(idsOf(snap.upserts.exercises)).toEqual(idsOf([global, legacyGlobal, mine]));
      expect(snap.upserts.exercises.find((e) => e.id === mine.id)).toMatchObject({
        name: "Moje", muscleGroups: ["CHEST"], description: null, creatorUserId: user.id, photos: [],
      });

      expect(idsOf(snap.upserts.plans)).toEqual(idsOf([builtin, foreignPublic, ownPlan]));
      const own = snap.upserts.plans.find((p) => p.id === ownPlan.id)!;
      expect(own).toMatchObject({ name: "Mój plan", isPublic: false, isFavorite: false, creatorUserId: user.id });
      expect(own.items.map((i: Row) => [i.exerciseId, i.orderInPlan])).toEqual([[mine.id, 0], [global.id, 1]]);
      expect(snap.upserts.plans.find((p) => p.id === foreignPublic.id)!.isFavorite).toBe(true);
      expect(snap.upserts.plans.find((p) => p.id === builtin.id)!.isFavorite).toBe(false);

      expect(snap.upserts.profile).toEqual({
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: null, isAdmin: false, activeWorkoutId: workout.id,
      });
      expect(snap.upserts.profile).not.toHaveProperty("password");

      expect(snap.upserts.workouts).toHaveLength(1);
      expect(snap.upserts.workouts[0]).toMatchObject({ id: workout.id, userId: user.id, workoutName: "Push", gymName: "Siłka", status: "DRAFT", skippedPlanExerciseIds: [] });
      expect(snap.upserts.workouts[0]).not.toHaveProperty("clientId");
      expect(snap.upserts.workoutItems).toHaveLength(1);
      expect(snap.upserts.workoutItems[0]).toMatchObject({ id: item.id, workoutId: workout.id, exerciseId: global.id, notes: "uwaga" });
      expect(snap.upserts.workoutSets).toHaveLength(1);
      expect(snap.upserts.workoutSets[0]).toMatchObject({ itemId: item.id, weight: "62.5", repetitions: 7, setNumber: 1 });
      expect(typeof snap.upserts.workoutSets[0]!.weight).toBe("string");
      expect(snap.deletes).toEqual([]);
    });

    it("notatka oczekująca trafia do snapshotu", async () => {
      const ex = await createTestExercise(null);
      await prisma.exercisePendingNote.create({ data: { userId: user.id, exerciseId: ex.id, note: "na później" } });
      const snap = await snapshotAll(user);
      expect(snap.upserts.pendingNotes).toEqual([expect.objectContaining({ exerciseId: ex.id, note: "na później" })]);
    });

    it("zdjęcia ćwiczenia idą w kolejności etapów (START przed END), też w REST", async () => {
      const ex = await createTestExercise(null);
      await prisma.exercisePhoto.create({ data: { exerciseId: ex.id, photoStage: "END", photoUrl: "exercise-photos/x-end.jpeg" } });
      await prisma.exercisePhoto.create({ data: { exerciseId: ex.id, photoStage: "START", photoUrl: "exercise-photos/x.jpeg" } });
      const snap = await snapshotAll(user);
      const pulled = snap.upserts.exercises.find((e) => e.id === ex.id);
      expect(pulled?.photos.map((p: Row) => p.photoStage)).toEqual(["START", "END"]);
      const rest = await api.get(user, "/api/exercises");
      const listed = (rest.body.data as Row[]).find((e) => e.id === ex.id);
      expect(listed?.photos.map((p: Row) => p.photoStage)).toEqual(["START", "END"]);
    });

    it("dzieli treningi na strony po 200 i pozostałe dane daje tylko na pierwszej", async () => {
      const ex = await createTestExercise(null);
      const rows = Array.from({ length: 205 }, () => ({ id: uuid(), userId: user.id }));
      await prisma.workout.createMany({ data: rows });
      // Items and sets for a workout at the very end of the id order and one at the start.
      const sorted = rows.map((r) => r.id).sort();
      const itemIds = [sorted[0]!, sorted[204]!].map(() => uuid());
      await prisma.workoutItem.createMany({
        data: [
          { id: itemIds[0]!, workoutId: sorted[0]!, exerciseId: ex.id, orderInWorkout: 1 },
          { id: itemIds[1]!, workoutId: sorted[204]!, exerciseId: ex.id, orderInWorkout: 1 },
        ],
      });
      await prisma.workoutSet.createMany({
        data: itemIds.map((itemId) => ({ itemId, setNumber: 1, weight: 10, repetitions: 5 })),
      });

      const first = await pullPage(user);
      expect(first.upserts.workouts).toHaveLength(200);
      expect(first.hasMore).toBe(true);
      expect(first.snapshotToken).toEqual(expect.any(String));
      expect(first.upserts.exercises).toHaveLength(1);
      expect(first.upserts.profile).not.toBeNull();
      expect(first.upserts.workoutItems.map((i) => i.id)).toEqual([itemIds[0]]);

      const second = await pullPage(user, `?snapshotToken=${first.snapshotToken}`);
      expect(second.upserts.workouts).toHaveLength(5);
      expect(second.hasMore).toBe(false);
      expect(second.snapshotToken).toBeNull();
      expect(second.upserts.exercises).toEqual([]);
      expect(second.upserts.profile).toBeNull();
      expect(second.upserts.workoutItems.map((i) => i.id)).toEqual([itemIds[1]]);
      expect(second.upserts.workoutSets).toHaveLength(1);
      expect(second.cursor).toBe(first.cursor);

      expect(idsOf([...first.upserts.workouts, ...second.upserts.workouts])).toEqual(sorted);
    });

    it("zapis wykonany w trakcie pobierania snapshotu przychodzi w pierwszym pobraniu przyrostowym", async () => {
      await prisma.workout.createMany({ data: Array.from({ length: 201 }, () => ({ id: uuid(), userId: user.id })) });
      const first = await pullPage(user);
      expect(first.hasMore).toBe(true);

      const during = await createWorkout(user, { workoutName: "w trakcie" }); // active pointer changes too
      const second = await pullPage(user, `?snapshotToken=${first.snapshotToken}`);
      expect(second.hasMore).toBe(false);

      const inc = await incremental(user, first.cursor!);
      expect(idsOf(inc.upserts.workouts)).toEqual([during.id]);
      expect(inc.upserts.profile).toMatchObject({ activeWorkoutId: during.id });
    });
  });

  describe("pobranie przyrostowe po zapisach starymi endpointami", () => {
    it("bez zmian: pusta odpowiedź, kursor przeskakuje do przodu i nie zwraca tych samych danych dwa razy", async () => {
      await createWorkout(user);
      const snap = await snapshotAll(user);
      const a = await pullPage(user, `?cursor=${snap.cursor}`);
      expect(a.upserts.workouts).toEqual([]); // written before the snapshot: already below its cursor
      const b = await pullPage(user, `?cursor=${a.cursor}`);
      expect(b.upserts).toEqual(emptyUpserts());
      expect(b.deletes).toEqual([]);
      expect(b.hasMore).toBe(false);
    });

    it("trening, pozycja, seria, notatka i zakończenie: kolejne upserty z pełnymi wierszami", async () => {
      const ex = await createTestExercise(null);
      const snap = await snapshotAll(user);

      const w = await createWorkout(user, { workoutName: "A" });
      const i1 = await incremental(user, snap.cursor);
      expect(idsOf(i1.upserts.workouts)).toEqual([w.id]);
      expect(i1.upserts.profile).toMatchObject({ activeWorkoutId: w.id });

      const item = await addExercise(user, w.id, ex.id);
      const set = await addSet(user, item.id, 100, 5);
      const i2 = await incremental(user, i1.cursor);
      expect(idsOf(i2.upserts.workoutItems)).toEqual([item.id]);
      expect(i2.upserts.workoutSets).toEqual([expect.objectContaining({ id: set.id, weight: "100", repetitions: 5 })]);
      expect(i2.upserts.workouts).toEqual([]);

      await api.patch(user, `/api/workouts/sets/${set.id}`, { weight: 102.5 });
      await api.patch(user, `/api/workouts/items/${item.id}`, { notes: "ciężko" });
      const i3 = await incremental(user, i2.cursor);
      expect(i3.upserts.workoutSets).toEqual([expect.objectContaining({ id: set.id, weight: "102.5" })]);
      expect(i3.upserts.workoutItems).toEqual([expect.objectContaining({ id: item.id, notes: "ciężko" })]);
      expect(i3.upserts.pendingNotes).toEqual([expect.objectContaining({ exerciseId: ex.id, note: "ciężko" })]);

      await api.patch(user, `/api/workouts/${w.id}`, { status: "COMPLETED", durationSeconds: 1200, workoutDate: "2026-03-01" }); // date-only (B1)
      const i4 = await incremental(user, i3.cursor);
      expect(i4.upserts.workouts).toEqual([expect.objectContaining({ id: w.id, status: "COMPLETED", durationSeconds: 1200 })]);
      expect(i4.upserts.profile).toMatchObject({ activeWorkoutId: null });

      // Adding the exercise to the next workout consumes the pending note: the client must see it deleted.
      const w2 = await createWorkout(user);
      await addExercise(user, w2.id, ex.id);
      const i5 = await incremental(user, i4.cursor);
      expect(i5.deletes).toContainEqual({ entity: "pendingNote", id: ex.id });
      expect(i5.upserts.workoutItems[0]).toMatchObject({ previousNote: "ciężko" });
    });

    it("usunięcie treningu: delete rodzica (dzieci klient usuwa kaskadą lokalną)", async () => {
      const ex = await createTestExercise(null);
      const w = await createWorkout(user);
      const item = await addExercise(user, w.id, ex.id);
      await addSet(user, item.id);
      const snap = await snapshotAll(user);
      expect(snap.upserts.workoutSets).toHaveLength(1);

      expect((await api.del(user, `/api/workouts/${w.id}`)).status).toBe(200);
      const inc = await incremental(user, snap.cursor);
      expect(inc.deletes).toContainEqual({ entity: "workout", id: w.id });
      expect(inc.upserts.workoutItems).toEqual([]);
      expect(inc.upserts.workoutSets).toEqual([]);
      expect(inc.upserts.workouts).toEqual([]);
      expect(inc.upserts.profile).toMatchObject({ activeWorkoutId: null });
    });

    it("usunięcie pozycji i serii pojedynczo", async () => {
      const ex = await createTestExercise(null);
      const w = await createWorkout(user);
      const item = await addExercise(user, w.id, ex.id);
      const set = await addSet(user, item.id);
      const snap = await snapshotAll(user);

      await api.del(user, `/api/workouts/sets/${set.id}`);
      const a = await incremental(user, snap.cursor);
      expect(a.deletes).toEqual([{ entity: "workoutSet", id: set.id }]);

      await api.del(user, `/api/workouts/items/${item.id}`);
      const b = await incremental(user, a.cursor);
      expect(b.deletes).toEqual([{ entity: "workoutItem", id: item.id }]);
    });

    it("ćwiczenia: utworzenie, edycja i usunięcie (z kaskadą na pozycje treningów i plany)", async () => {
      const snap0 = await snapshotAll(user);
      const created = await api.post(user, "/api/exercises", { name: "Własne", muscleGroups: ["BACK"] });
      expect(created.status).toBe(201);
      const exId = created.body.data.id as string;
      const a = await incremental(user, snap0.cursor);
      expect(a.upserts.exercises).toEqual([expect.objectContaining({ id: exId, name: "Własne", creatorUserId: user.id })]);

      await api.patch(user, `/api/exercises/${exId}`, { name: "Własne 2" });
      const b = await incremental(user, a.cursor);
      expect(b.upserts.exercises).toEqual([expect.objectContaining({ id: exId, name: "Własne 2" })]);

      const w = await createWorkout(user);
      const item = await addExercise(user, w.id, exId);
      const plan = await createPlan(user, "Plan z własnym", [exId]);
      const c0 = await incremental(user, b.cursor);

      expect((await api.del(user, `/api/exercises/${exId}`)).status).toBe(204);
      const c = await incremental(user, c0.cursor);
      expect(c.deletes).toEqual(expect.arrayContaining([
        { entity: "exercise", id: exId },
        { entity: "workoutItem", id: item.id }, // cascade: the workout survives, its item does not
      ]));
      // The plan loses the item but survives: pushed as an upsert without the exercise.
      expect(c.upserts.plans).toEqual([expect.objectContaining({ id: plan.id, items: [] })]);
    });

    it("plany: utworzenie, edycja, ulubione, duplikat i usunięcie", async () => {
      const ex = await createTestExercise(null);
      const ex2 = await createTestExercise(null, "Drugie");
      const snap = await snapshotAll(user);

      const plan = await createPlan(user, "Plan A", [ex.id]);
      const a = await incremental(user, snap.cursor);
      expect(a.upserts.plans).toEqual([expect.objectContaining({ id: plan.id, isFavorite: false, items: [expect.objectContaining({ exerciseId: ex.id, orderInPlan: 0 })] })]);

      await api.put(user, `/api/plans/${plan.id}`, { name: "Plan A+", exerciseIds: [ex2.id, ex.id] });
      const b = await incremental(user, a.cursor);
      const updated = b.upserts.plans.find((p) => p.id === plan.id)!;
      expect(updated.name).toBe("Plan A+");
      expect(updated.items.map((i: Row) => i.exerciseId)).toEqual([ex2.id, ex.id]);

      await api.post(user, `/api/plans/${plan.id}/favorite`);
      const c = await incremental(user, b.cursor);
      expect(c.upserts.plans).toEqual([expect.objectContaining({ id: plan.id, isFavorite: true })]);

      const dup = await api.post(user, `/api/plans/${plan.id}/duplicate`);
      expect(dup.status).toBe(201);
      await api.del(user, `/api/plans/${plan.id}/favorite`);
      const d = await incremental(user, c.cursor);
      expect(idsOf(d.upserts.plans)).toEqual([plan.id, dup.body.data.id].sort());
      expect(d.upserts.plans.find((p) => p.id === plan.id)!.isFavorite).toBe(false);

      await api.del(user, `/api/plans/${plan.id}`);
      const e = await incremental(user, d.cursor);
      expect(e.deletes).toContainEqual({ entity: "plan", id: plan.id });
    });

    it("usunięcie planu zeruje workoutPlanId w treningu (upsert treningu)", async () => {
      const ex = await createTestExercise(null);
      const plan = await createPlan(user, "Plan", [ex.id]);
      const w = await createWorkout(user, { workoutPlanId: plan.id });
      const snap = await snapshotAll(user);
      expect(snap.upserts.workouts[0]).toMatchObject({ workoutPlanId: plan.id });

      await api.del(user, `/api/plans/${plan.id}`);
      const inc = await incremental(user, snap.cursor);
      expect(inc.deletes).toContainEqual({ entity: "plan", id: plan.id });
      expect(inc.upserts.workouts).toEqual([expect.objectContaining({ id: w.id, workoutPlanId: null })]);
    });

    it("pominięcie ćwiczenia z planu aktualizuje skippedPlanExerciseIds", async () => {
      const ex = await createTestExercise(null);
      const plan = await createPlan(user, "Plan", [ex.id]);
      const w = await createWorkout(user, { workoutPlanId: plan.id });
      const snap = await snapshotAll(user);
      expect((await api.post(user, `/api/workouts/${w.id}/skip-plan-exercise`, { exerciseId: ex.id })).status).toBe(200);
      const inc = await incremental(user, snap.cursor);
      expect(inc.upserts.workouts).toEqual([expect.objectContaining({ id: w.id, skippedPlanExerciseIds: [ex.id] })]);
    });
  });

  describe("pobranie przyrostowe po zapisach przez push", () => {
    it("zapisy pushem są widoczne w pull (też te z drugiego urządzenia) i odwrotnie", async () => {
      const ex = await createTestExercise(null);
      const snap = await snapshotAll(user);
      const at = new Date(Date.now() - 5000).toISOString();
      const wId = uuid();
      const iId = uuid();
      const sId = uuid();
      const exId = uuid();
      const pId = uuid();
      const op = (type: string, fields: object) => ({ opId: uuid(), type, at, ...fields });
      const res = await api.post(user, "/api/sync/push", {
        deviceId: "dev-1",
        ops: [
          op("exercise.create", { id: exId, name: "Z telefonu", muscleGroups: ["CHEST"] }),
          op("workout.create", { id: wId, workoutDate: at, startedAt: at }),
          op("item.add", { id: iId, workoutId: wId, exerciseId: ex.id, orderInWorkout: 1 }),
          op("set.add", { id: sId, itemId: iId, setNumber: 1, weight: "42.5", repetitions: 9 }),
          op("plan.create", { id: pId, name: "Plan z telefonu", exerciseIds: [ex.id, exId], isPublic: false }),
          op("plan.favorite", { id: pId }),
        ],
      });
      expect(res.body.data.results.map((r: Row) => r.status)).toEqual(Array(6).fill("applied"));

      const inc = await incremental(user, snap.cursor);
      expect(idsOf(inc.upserts.workouts)).toEqual([wId]);
      expect(idsOf(inc.upserts.workoutItems)).toEqual([iId]);
      expect(inc.upserts.workoutSets).toEqual([expect.objectContaining({ id: sId, weight: "42.5", repetitions: 9 })]);
      expect(idsOf(inc.upserts.exercises)).toEqual([exId]);
      expect(inc.upserts.plans).toEqual([expect.objectContaining({ id: pId, isFavorite: true })]);
      expect(inc.upserts.profile).toMatchObject({ activeWorkoutId: wId });

      // A PWA edit afterwards is picked up too.
      await api.patch(user, `/api/workouts/sets/${sId}`, { repetitions: 10 });
      const again = await incremental(user, inc.cursor);
      expect(again.upserts.workoutSets).toEqual([expect.objectContaining({ id: sId, repetitions: 10 })]);

      // And a push delete shows up as a delete.
      await api.post(user, "/api/sync/push", { deviceId: "dev-1", ops: [op("workout.delete", { id: wId })] });
      const del = await incremental(user, again.cursor);
      expect(del.deletes).toContainEqual({ entity: "workout", id: wId });
    });
  });

  describe("widoczność", () => {
    it("plan publiczny innego użytkownika: upsert, a po zmianie na prywatny delete (właściciel nadal ma upsert)", async () => {
      const ex = await createTestExercise(null);
      const snap = await snapshotAll(user);
      const ownerSnap = await snapshotAll(other);

      const plan = await createPlan(other, "Do podglądu", [ex.id], true);
      const a = await incremental(user, snap.cursor);
      expect(idsOf(a.upserts.plans)).toEqual([plan.id]);

      const ownerA = await incremental(other, ownerSnap.cursor);
      expect(idsOf(ownerA.upserts.plans)).toEqual([plan.id]);

      await api.put(other, `/api/plans/${plan.id}`, { isPublic: false });
      const b = await incremental(user, a.cursor);
      expect(b.deletes).toContainEqual({ entity: "plan", id: plan.id });
      expect(b.upserts.plans).toEqual([]);
      const ownerB = await incremental(other, ownerA.cursor);
      expect(idsOf(ownerB.upserts.plans)).toEqual([plan.id]);
      expect(ownerB.deletes).toEqual([]);

      // Back to public: visible again.
      await api.put(other, `/api/plans/${plan.id}`, { isPublic: true });
      const c = await incremental(user, b.cursor);
      expect(idsOf(c.upserts.plans)).toEqual([plan.id]);
    });

    it("ulubiony cudzy plan publiczny, który właściciel usuwa: delete u obserwującego", async () => {
      const ex = await createTestExercise(null);
      const plan = await createPlan(other, "Cudzy", [ex.id], true);
      await api.post(user, `/api/plans/${plan.id}/favorite`);
      const snap = await snapshotAll(user);
      expect(snap.upserts.plans[0]).toMatchObject({ id: plan.id, isFavorite: true });

      await api.del(other, `/api/plans/${plan.id}`);
      const inc = await incremental(user, snap.cursor);
      expect(inc.deletes).toContainEqual({ entity: "plan", id: plan.id });
    });

    it("ćwiczenie globalne dodane przez admina trafia do wszystkich", async () => {
      const admin = await createTestUser({ isAdmin: true });
      const s1 = await snapshotAll(user);
      const s2 = await snapshotAll(other);
      const res = await api.post(admin, "/api/exercises", { name: "Globalne admina", muscleGroups: ["ABS"], isGlobal: true });
      expect(res.status).toBe(201);
      for (const [u, s] of [[user, s1], [other, s2]] as const) {
        const inc = await incremental(u, s.cursor);
        expect(idsOf(inc.upserts.exercises)).toEqual([res.body.data.id]);
      }
    });

    it("dwóch użytkowników jest odizolowanych: treningi, serie, prywatne ćwiczenia i notatki nie przeciekają", async () => {
      const ex = await createTestExercise(null);
      const snapU = await snapshotAll(user);
      const snapO = await snapshotAll(other);

      const wo = await createWorkout(other, { workoutName: "obcy" });
      const io = await addExercise(other, wo.id, ex.id);
      await addSet(other, io.id);
      await api.patch(other, `/api/workouts/items/${io.id}`, { notes: "sekret" });
      await api.post(other, "/api/exercises", { name: "Prywatne obcego", muscleGroups: ["BACK"] });
      await createPlan(other, "Prywatny plan obcego", [ex.id], false);

      const incU = await incremental(user, snapU.cursor);
      expect(incU.upserts).toEqual(emptyUpserts());
      expect(incU.deletes).toEqual([]);

      const afterSnap = await snapshotAll(user);
      expect(afterSnap.upserts.workouts).toEqual([]);
      expect(afterSnap.upserts.workoutSets).toEqual([]);
      expect(afterSnap.upserts.pendingNotes).toEqual([]);
      expect(afterSnap.upserts.exercises.map((e) => e.name)).toEqual([ex.name]);
      expect(afterSnap.upserts.plans).toEqual([]);

      const incO = await incremental(other, snapO.cursor);
      expect(idsOf(incO.upserts.workouts)).toEqual([wo.id]);
    });
  });

  describe("limit 500 zmian", () => {
    it("zwraca najwyżej 500 zmian na odpowiedź i prowadzi dalej kursorem", async () => {
      const snap = await snapshotAll(user);
      const ids = Array.from({ length: 620 }, () => uuid());
      await prisma.workout.createMany({ data: ids.map((id) => ({ id, userId: user.id })) });

      const first = await pullPage(user, `?cursor=${snap.cursor}`);
      expect(first.hasMore).toBe(true);
      expect(first.upserts.workouts).toHaveLength(500);
      const second = await pullPage(user, `?cursor=${first.cursor}`);
      expect(second.hasMore).toBe(false);
      expect(second.upserts.workouts).toHaveLength(120);
      expect(idsOf([...first.upserts.workouts, ...second.upserts.workouts])).toEqual([...ids].sort());
    });
  });

  describe("kursor odporny na równoległe transakcje", () => {
    it("zmiana z trwającej transakcji A, zatwierdzona po transakcji B, nie jest pominięta", async () => {
      const snap = await snapshotAll(user);
      const aId = uuid();
      const bId = uuid();

      let releaseA!: () => void;
      let aWrote!: () => void;
      const wroteA = new Promise<void>((r) => (aWrote = r));
      const holdA = new Promise<void>((r) => (releaseA = r));
      // Transaction A writes and stays open.
      const txA = prisma.$transaction(
        async (tx) => {
          await tx.workout.create({ data: { id: aId, userId: user.id, workoutName: "A" } });
          aWrote();
          await holdA;
        },
        { timeout: 20_000, maxWait: 10_000 },
      );
      await wroteA;

      // B starts and commits after A has started.
      await prisma.workout.create({ data: { id: bId, userId: user.id, workoutName: "B" } });

      const first = await pullPage(user, `?cursor=${snap.cursor}`);
      // A is not committed, and B (a LATER transaction) is withheld too: the cursor must not move past A.
      expect(first.upserts.workouts).toEqual([]);
      releaseA();
      await txA;

      const second = await incremental(user, first.cursor!);
      expect(idsOf([...first.upserts.workouts, ...second.upserts.workouts])).toEqual([aId, bId].sort());
      expect(second.upserts.workouts.map((w) => w.id)).toContain(aId);
    });
  });

  describe("retencja i resyncRequired", () => {
    it("kursor wydany dawniej niż 90 dni wstecz wymaga pełnego pobrania", async () => {
      const snap = await snapshotAll(user);
      const [, txid, seq] = snap.cursor.split(".");
      const old = Date.now() - RETENTION_MS - 60_000;
      const page = await pullPage(user, `?cursor=v1.${txid}.${seq}.${old}`);
      expect(page).toMatchObject({ resyncRequired: true, hasMore: false, cursor: null, deletes: [] });
      expect(page.upserts).toEqual(emptyUpserts());

      const fresh = Date.now() - RETENTION_MS + 3_600_000;
      expect((await pullPage(user, `?cursor=v1.${txid}.${seq}.${fresh}`)).resyncRequired).toBe(false);
    });

    it("czyszczenie usuwa wpisy dziennika i operacji starsze niż 90 dni, nowsze zostają", async () => {
      const w = await createWorkout(user);
      const at = new Date(Date.now() - 1000).toISOString();
      await api.post(user, "/api/sync/push", { deviceId: "d", ops: [{ opId: uuid(), type: "workout.delete", at, id: uuid() }] });
      expect(await prisma.syncOperation.count()).toBe(1);
      const total = await prisma.syncChange.count();
      expect(total).toBeGreaterThan(0);

      const old = new Date(Date.now() - RETENTION_MS - 3_600_000);
      await prisma.syncChange.updateMany({ where: { entityId: w.id }, data: { createdAt: old } });
      await prisma.syncOperation.updateMany({ data: { createdAt: old } });
      const oldChanges = await prisma.syncChange.count({ where: { createdAt: old } });
      expect(oldChanges).toBeGreaterThan(0);

      const purged = await purgeOldSyncData();
      expect(purged).toEqual({ changes: oldChanges, operations: 1 });
      expect(await prisma.syncChange.count()).toBe(total - oldChanges);
    });
  });
});
