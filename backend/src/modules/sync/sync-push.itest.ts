import { randomUUID as uuid } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestExercise, createTestUser, prisma, resetDb, tokenFor } from "../../test/db.js";

/**
 * POST /api/sync/push na prawdziwej bazie. Dane zapisane przez push są odczytywane
 * STARYMI endpointami (jak robi to PWA), a stare endpointy służą też do tworzenia
 * stanu "z drugiego urządzenia".
 */

const app = createApp();

type User = Awaited<ReturnType<typeof createTestUser>>;
type Op = Record<string, unknown> & { opId: string; type: string; at: string };

const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const op = (type: string, fields: Record<string, unknown> = {}, at = iso(-1000)): Op => ({
  opId: uuid(),
  type,
  at,
  ...fields,
});

const auth = (user: User) => ({ Authorization: `Bearer ${tokenFor(user)}` });

const push = async (user: User, ops: Op[], deviceId = "device-A") => {
  const res = await request(app).post("/api/sync/push").set(auth(user)).send({ deviceId, ops });
  return res;
};
const pushOk = async (user: User, ops: Op[]) => {
  const res = await push(user, ops);
  expect(res.status).toBe(200);
  return res.body.data.results as Array<{ opId: string; status: string; code?: string; error?: string; current?: unknown }>;
};
const statuses = (results: Array<{ status: string }>) => results.map((r) => r.status);
const get = (user: User, url: string) => request(app).get(url).set(auth(user));

const workoutOps = (id = uuid(), startedAt = iso(-60_000)) => ({
  id,
  create: op("workout.create", { id, workoutDate: startedAt, workoutName: "Push A", gymName: "Siłownia", startedAt }, startedAt),
});

describe("POST /api/sync/push", () => {
  let user: User;
  let other: User;

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
    other = await createTestUser();
  });

  describe("kontrakt", () => {
    it("401 bez tokenu", async () => {
      const res = await request(app).post("/api/sync/push").send({ deviceId: "d", ops: [op("workout.delete", { id: uuid() })] });
      expect(res.status).toBe(401);
    });

    it("400 dla pustej paczki, braku deviceId i więcej niż 100 operacji", async () => {
      expect((await push(user, [])).status).toBe(400);
      const noDevice = await request(app).post("/api/sync/push").set(auth(user)).send({ ops: [op("workout.delete", { id: uuid() })] });
      expect(noDevice.status).toBe(400);
      const many = Array.from({ length: 101 }, () => op("workout.delete", { id: uuid() }));
      expect((await push(user, many)).status).toBe(400);
    });

    it("przyjmuje dokładnie 100 operacji i zwraca serverTime", async () => {
      const ops = Array.from({ length: 100 }, () => op("workout.delete", { id: uuid() }));
      const res = await push(user, ops);
      expect(res.status).toBe(200);
      expect(res.body.data.results).toHaveLength(100);
      expect(Date.parse(res.body.data.serverTime)).not.toBeNaN();
    });
  });

  describe("trening od startu do zakończenia", () => {
    it("zapisuje identyfikatory i czasy z urządzenia, a stare endpointy widzą poprawne dane", async () => {
      const exercise = await createTestExercise(null);
      const base = Date.now() - 3_600_000;
      const startedAt = new Date(base).toISOString();
      const { id: workoutId, create } = workoutOps(uuid(), startedAt);
      const itemId = uuid();
      const setA = uuid();
      const setB = uuid();
      const t = (min: number) => new Date(base + min * 60_000).toISOString();

      const results = await pushOk(user, [
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }, t(1)),
        op("set.add", { id: setA, itemId, setNumber: 1, weight: 60, repetitions: 8 }, t(2)),
        op("set.add", { id: setB, itemId, setNumber: 2, weight: "62.5", repetitions: 6 }, t(5)),
        op("set.update", { id: setB, repetitions: 7 }, t(6)),
        op("item.update", { id: itemId, notes: "łokcie wąsko" }, t(7)),
        op("workout.complete", { id: workoutId, durationSeconds: 2400 }, t(40)),
      ]);
      expect(statuses(results)).toEqual(Array(7).fill("applied"));

      const res = await get(user, `/api/workouts/${workoutId}`);
      expect(res.status).toBe(200);
      const w = res.body.data;
      expect(w.id).toBe(workoutId);
      expect(w.status).toBe("COMPLETED");
      expect(w.durationSeconds).toBe(2400);
      expect(w.workoutName).toBe("Push A");
      expect(w.createdAt).toBe(startedAt); // czas startu z urządzenia, nie z chwili dotarcia paczki
      expect(w.updatedAt).toBe(t(40));
      expect(w.items).toHaveLength(1);
      expect(w.items[0].id).toBe(itemId);
      expect(w.items[0].createdAt).toBe(t(1));
      expect(w.items[0].notes).toBe("łokcie wąsko");
      expect(w.items[0].sets.map((s: { id: string }) => s.id)).toEqual([setA, setB]);
      expect(w.items[0].sets[0].createdAt).toBe(t(2));
      expect(w.items[0].sets[1]).toMatchObject({ weight: "62.5", repetitions: 7, setNumber: 2, updatedAt: t(6) });

      const list = await get(user, "/api/workouts");
      expect(list.body.data.map((x: { id: string }) => x.id)).toEqual([workoutId]);
    });

    it("po workout.complete statystyki są przebudowane, a notatka trafia do następnego treningu", async () => {
      const exercise = await createTestExercise(null);
      const { id: workoutId, create } = workoutOps();
      const itemId = uuid();
      await pushOk(user, [
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: uuid(), itemId, setNumber: 1, weight: 100, repetitions: 5 }),
        op("set.add", { id: uuid(), itemId, setNumber: 2, weight: 90, repetitions: 10 }),
        op("item.update", { id: itemId, notes: "zwolnić tempo" }),
        op("workout.complete", { id: workoutId, durationSeconds: 1800 }),
      ]);

      const stats = await get(user, "/api/workouts/stats/all");
      expect(stats.body.data).toHaveLength(1);
      expect(stats.body.data[0]).toMatchObject({ exerciseId: exercise.id, maxWeight: "100", maxWeightReps: 5, totalWorkouts: 1, lastNote: "zwolnić tempo" });

      const pending = await prisma.exercisePendingNote.findUnique({ where: { userId_exerciseId: { userId: user.id, exerciseId: exercise.id } } });
      expect(pending?.note).toBe("zwolnić tempo");

      // Drugi trening z tym ćwiczeniem dostaje previousNote (stary endpoint + notatka z pusha).
      const second = workoutOps();
      await pushOk(user, [
        second.create,
        op("item.add", { id: uuid(), workoutId: second.id, exerciseId: exercise.id, orderInWorkout: 1 }),
      ]);
      const w = await get(user, `/api/workouts/${second.id}`);
      expect(w.body.data.items[0].previousNote).toBe("zwolnić tempo");
      expect(await prisma.exercisePendingNote.count()).toBe(0);
    });

    it("edycja serii w zakończonym treningu przebudowuje statystyki, usunięcie treningu je czyści", async () => {
      const exercise = await createTestExercise(null);
      const { id: workoutId, create } = workoutOps();
      const itemId = uuid();
      const setId = uuid();
      await pushOk(user, [
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: setId, itemId, setNumber: 1, weight: 50, repetitions: 5 }),
        op("workout.complete", { id: workoutId, durationSeconds: 600 }),
      ]);
      await pushOk(user, [op("set.update", { id: setId, weight: 55 }, iso(-10))]);
      expect((await get(user, "/api/workouts/stats/all")).body.data[0].maxWeight).toBe("55");

      await pushOk(user, [op("workout.delete", { id: workoutId })]);
      expect((await get(user, "/api/workouts/stats/all")).body.data).toHaveLength(0);
      expect(await prisma.exerciseUserStats.count()).toBe(0);
    });

    it("workout.update zmienia pola i pozwala je wyczyścić", async () => {
      const { id, create } = workoutOps();
      await pushOk(user, [create]);
      const r = await pushOk(user, [op("workout.update", { id, workoutName: "Pull B", gymName: null, workoutNotes: "ok", durationSeconds: 300 })]);
      expect(r[0]!.status).toBe("applied");
      const w = (await get(user, `/api/workouts/${id}`)).body.data;
      expect(w).toMatchObject({ workoutName: "Pull B", gymName: null, workoutNotes: "ok", durationSeconds: 300 });
    });

    it("item.delete i set.delete usuwają rekordy; usunięcie nieistniejących jest sukcesem", async () => {
      const exercise = await createTestExercise(null);
      const { id: workoutId, create } = workoutOps();
      const itemId = uuid();
      const setId = uuid();
      await pushOk(user, [
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: setId, itemId, setNumber: 1, weight: 50, repetitions: 5 }),
      ]);
      const r = await pushOk(user, [
        op("set.delete", { id: setId }),
        op("set.delete", { id: setId }),
        op("item.delete", { id: itemId }),
        op("item.delete", { id: itemId }),
        op("workout.delete", { id: uuid() }),
      ]);
      expect(statuses(r)).toEqual(Array(5).fill("applied"));
      expect((await get(user, `/api/workouts/${workoutId}`)).body.data.items).toHaveLength(0);
    });
  });

  describe("ćwiczenia", () => {
    it("create / update / delete, widoczne przez GET /api/exercises", async () => {
      const id = uuid();
      const created = iso(-5000);
      const r1 = await pushOk(user, [op("exercise.create", { id, name: "Martwy ciąg", muscleGroups: ["BACK", "HAMSTRINGS"], description: "opis" }, created)]);
      expect(r1[0]!.status).toBe("applied");
      let ex = (await get(user, "/api/exercises")).body.data.find((e: { id: string }) => e.id === id);
      expect(ex).toMatchObject({ name: "Martwy ciąg", creatorUserId: user.id, description: "opis", createdAt: created, updatedAt: created });

      await pushOk(user, [op("exercise.update", { id, name: "Martwy ciąg RDL", description: null }, iso(-1000))]);
      ex = (await get(user, "/api/exercises")).body.data.find((e: { id: string }) => e.id === id);
      expect(ex).toMatchObject({ name: "Martwy ciąg RDL", description: null });

      await pushOk(user, [op("exercise.delete", { id })]);
      expect((await get(user, "/api/exercises")).body.data.find((e: { id: string }) => e.id === id)).toBeUndefined();
    });

    it("usunięcie ćwiczenia kasuje kaskadowo historię treningów (jak stary endpoint)", async () => {
      const exId = uuid();
      const { id: workoutId, create } = workoutOps();
      const itemId = uuid();
      await pushOk(user, [
        op("exercise.create", { id: exId, name: "Własne", muscleGroups: ["CHEST"] }),
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exId, orderInWorkout: 1 }),
        op("set.add", { id: uuid(), itemId, setNumber: 1, weight: 40, repetitions: 10 }),
        op("workout.complete", { id: workoutId, durationSeconds: 100 }),
      ]);
      expect(await prisma.exerciseUserStats.count()).toBe(1);
      await pushOk(user, [op("exercise.delete", { id: exId })]);
      expect(await prisma.workoutItem.count()).toBe(0);
      expect(await prisma.workoutSet.count()).toBe(0);
      expect(await prisma.exerciseUserStats.count()).toBe(0);
      expect(await prisma.workout.count()).toBe(1);
    });

    it("globalne ćwiczenie tylko dla admina; cudze ćwiczenie nie do edycji ani usunięcia", async () => {
      const admin = await createTestUser({ isAdmin: true });
      const r = await pushOk(user, [op("exercise.create", { id: uuid(), name: "Global", muscleGroups: ["CHEST"], isGlobal: true })]);
      expect(r[0]).toMatchObject({ status: "rejected", code: "forbidden" });

      const gid = uuid();
      expect(statuses(await pushOk(admin, [op("exercise.create", { id: gid, name: "Global", muscleGroups: ["CHEST"], isGlobal: true })]))).toEqual(["applied"]);
      expect((await prisma.exercise.findUnique({ where: { id: gid } }))?.creatorUserId).toBeNull();

      const upd = await pushOk(user, [op("exercise.update", { id: gid, name: "Hack" }), op("exercise.delete", { id: gid })]);
      expect(upd.map((x) => x.code)).toEqual(["forbidden", "forbidden"]);
      expect((await prisma.exercise.findUnique({ where: { id: gid } }))?.name).toBe("Global");
    });
  });

  describe("plany", () => {
    it("create, update (wersje historii), duplicate, favorite, unfavorite, delete", async () => {
      const e1 = await createTestExercise(null, "A");
      const e2 = await createTestExercise(null, "B");
      const planId = uuid();
      const copyId = uuid();
      const created = iso(-8000);
      const updated = iso(-4000);

      const r = await pushOk(user, [
        op("plan.create", { id: planId, name: "Push day", shortName: "PD", exerciseIds: [e1.id, e2.id], isPublic: false }, created),
        op("plan.update", { id: planId, name: "Push day v2", exerciseIds: [e2.id, e1.id] }, updated),
        op("plan.duplicate", { id: copyId, sourceId: planId, name: "Push day v2 (kopia)" }, iso(-3000)),
        op("plan.favorite", { id: planId }),
      ]);
      expect(statuses(r)).toEqual(Array(4).fill("applied"));

      const mine = (await get(user, "/api/plans?tab=mine")).body.data;
      const plan = mine.find((p: { id: string }) => p.id === planId);
      expect(plan).toMatchObject({ name: "Push day v2", isFavorite: true, createdAt: created, updatedAt: updated });
      expect(plan.items.map((i: { exerciseId: string }) => i.exerciseId)).toEqual([e2.id, e1.id]);
      const copy = mine.find((p: { id: string }) => p.id === copyId);
      expect(copy).toMatchObject({ name: "Push day v2 (kopia)", isPublic: false });
      expect(copy.items.map((i: { exerciseId: string }) => i.exerciseId)).toEqual([e2.id, e1.id]);

      // Historia planu przez istniejące funkcje: v1 (utworzenie) i v2 (edycja).
      const history = (await get(user, `/api/plans/${planId}/history`)).body.data;
      expect(history.map((v: { version: number }) => v.version)).toEqual([2, 1]);

      const r2 = await pushOk(user, [op("plan.unfavorite", { id: planId }), op("plan.delete", { id: planId }), op("plan.delete", { id: planId }), op("plan.unfavorite", { id: planId })]);
      expect(statuses(r2)).toEqual(Array(4).fill("applied"));
      expect((await get(user, "/api/plans?tab=mine")).body.data.map((p: { id: string }) => p.id)).toEqual([copyId]);
    });

    it("trening z planu: workout.create z workoutPlanId i workout.skipPlanExercise", async () => {
      const e1 = await createTestExercise(null, "A");
      const e2 = await createTestExercise(null, "B");
      const planId = uuid();
      const { id, create } = workoutOps();
      create.workoutPlanId = planId;
      const r = await pushOk(user, [
        op("plan.create", { id: planId, name: "Plan", exerciseIds: [e1.id, e2.id], isPublic: false }),
        create,
        op("workout.skipPlanExercise", { id, exerciseId: e1.id }),
      ]);
      expect(statuses(r)).toEqual(["applied", "applied", "applied"]);
      const next = (await get(user, `/api/workouts/${id}/next-from-plan`)).body.data;
      expect(next.next.exerciseId).toBe(e2.id);
      expect((await prisma.workout.findUnique({ where: { id } }))?.skippedPlanExerciseIds).toEqual([e1.id]);
    });

    it("odrzuca: nazwa zajęta, plan publiczny z prywatnym ćwiczeniem, brak planu", async () => {
      const pub = await createTestExercise(null, "Global");
      const priv = await createTestExercise(user.id, "Moje");
      await pushOk(user, [op("plan.create", { id: uuid(), name: "Zajęta", exerciseIds: [pub.id], isPublic: false })]);

      const r = await pushOk(user, [
        op("plan.create", { id: uuid(), name: "Zajęta", exerciseIds: [pub.id], isPublic: false }),
        op("plan.create", { id: uuid(), name: "Publiczny", exerciseIds: [pub.id, priv.id], isPublic: true }),
        op("plan.update", { id: uuid(), name: "Nie ma" }),
        op("plan.create", { id: uuid(), name: "Brak ćwiczenia", exerciseIds: [uuid()], isPublic: false }),
      ]);
      expect(r.map((x) => [x.status, x.code])).toEqual([
        ["rejected", "conflict"],
        ["rejected", "bad_request"],
        ["rejected", "not_found"],
        ["rejected", "bad_request"],
      ]);
      expect(r[0]!.error).toBe("Plan with this name already exists");
      expect(r[1]!.error).toContain("Cannot make plan public: contains private exercises (Moje)");
      expect(await prisma.workoutPlan.count()).toBe(1);
    });

    it("odrzucenie nie zostawia częściowych zmian (plan.update z nieistniejącym ćwiczeniem)", async () => {
      const e1 = await createTestExercise(null, "A");
      const planId = uuid();
      await pushOk(user, [op("plan.create", { id: planId, name: "Plan", exerciseIds: [e1.id], isPublic: false })]);
      const versionsBefore = await prisma.workoutPlanVersion.count();

      const r = await pushOk(user, [op("plan.update", { id: planId, name: "Nowa nazwa", exerciseIds: [uuid()] })]);
      expect(r[0]!.status).toBe("rejected");
      const plan = await prisma.workoutPlan.findUnique({ where: { id: planId }, include: { items: true } });
      expect(plan?.name).toBe("Plan");
      expect(plan?.items.map((i) => i.exerciseId)).toEqual([e1.id]);
      expect(await prisma.workoutPlanVersion.count()).toBe(versionsBefore);
    });

    it("cudzy plan: ulubione i duplikat dla publicznego, odmowa edycji i usunięcia", async () => {
      const pub = await createTestExercise(null, "Global");
      const planId = uuid();
      await pushOk(other, [op("plan.create", { id: planId, name: "Cudzy publiczny", exerciseIds: [pub.id], isPublic: true })]);
      const privateId = uuid();
      await pushOk(other, [op("plan.create", { id: privateId, name: "Cudzy prywatny", exerciseIds: [pub.id], isPublic: false })]);

      const r = await pushOk(user, [
        op("plan.favorite", { id: planId }),
        op("plan.duplicate", { id: uuid(), sourceId: planId, name: "Cudzy publiczny (kopia)" }),
        op("plan.update", { id: planId, name: "Przejęty" }),
        op("plan.delete", { id: planId }),
        op("plan.favorite", { id: privateId }),
        op("plan.duplicate", { id: uuid(), sourceId: privateId, name: "Kopia prywatnego" }),
      ]);
      expect(r.map((x) => [x.status, x.code])).toEqual([
        ["applied", undefined],
        ["applied", undefined],
        ["rejected", "forbidden"],
        ["rejected", "forbidden"],
        ["rejected", "not_found"],
        ["rejected", "not_found"],
      ]);
    });
  });

  describe("idempotencja", () => {
    it("ta sama paczka wysłana dwukrotnie: druga odpowiedź to duplicate, bez duplikatów danych", async () => {
      const exercise = await createTestExercise(null);
      const { id: workoutId, create } = workoutOps();
      const itemId = uuid();
      const ops = [
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: uuid(), itemId, setNumber: 1, weight: 50, repetitions: 5 }),
        op("workout.complete", { id: workoutId, durationSeconds: 100 }),
      ];
      const first = await pushOk(user, ops);
      expect(statuses(first)).toEqual(Array(4).fill("applied"));
      const second = await pushOk(user, ops);
      expect(statuses(second)).toEqual(Array(4).fill("duplicate"));
      expect(second.map((r) => r.opId)).toEqual(ops.map((o) => o.opId));

      expect(await prisma.workout.count()).toBe(1);
      expect(await prisma.workoutItem.count()).toBe(1);
      expect(await prisma.workoutSet.count()).toBe(1);
      expect(await prisma.syncOperation.count()).toBe(4);
    });

    it("powtórka odrzuconej operacji zwraca to samo odrzucenie", async () => {
      const bad = op("set.update", { id: uuid(), weight: 10 });
      const first = (await pushOk(user, [bad]))[0]!;
      const second = (await pushOk(user, [bad]))[0]!;
      expect(first.status).toBe("rejected");
      expect(second).toEqual(first);
    });

    it("powtórka z innym opId (naturalna idempotencja): create istniejącego rekordu to sukces bez zmian", async () => {
      const { id, create } = workoutOps();
      await pushOk(user, [create]);
      const again = { ...create, opId: uuid(), workoutName: "Inna nazwa" };
      expect(statuses(await pushOk(user, [again]))).toEqual(["applied"]);
      expect((await prisma.workout.findUnique({ where: { id } }))?.workoutName).toBe("Push A");
      expect(await prisma.workout.count()).toBe(1);
    });

    it("równoległe wysłanie tej samej operacji: jedno applied, drugie duplicate", async () => {
      const { create } = workoutOps();
      const [a, b] = await Promise.all([push(user, [create]), push(user, [create])]);
      const all = [a.body.data.results[0].status, b.body.data.results[0].status].sort();
      expect(all).toEqual(["applied", "duplicate"]);
      expect(await prisma.workout.count()).toBe(1);
    });

    it("opId innego konta jest odrzucany", async () => {
      const shared = op("workout.delete", { id: uuid() });
      await pushOk(user, [shared]);
      const r = await pushOk(other, [shared]);
      expect(r[0]).toMatchObject({ status: "rejected", code: "forbidden" });
    });
  });

  describe("reguła nowszej zmiany", () => {
    it("starsza zmiana to superseded (z current), równa lub nowsza wygrywa, a updatedAt = at", async () => {
      const { id, create } = workoutOps();
      await pushOk(user, [create]);
      // "PWA" zmienia nazwę teraz.
      await request(app).patch(`/api/workouts/${id}`).set(auth(user)).send({ workoutName: "z PWA" });
      const server = await prisma.workout.findUniqueOrThrow({ where: { id } });

      const stale = await pushOk(user, [op("workout.update", { id, workoutName: "stara zmiana z apki" }, new Date(server.updatedAt.getTime() - 5000).toISOString())]);
      expect(stale[0]!.status).toBe("superseded");
      expect(stale[0]!.current).toMatchObject({ id, workoutName: "z PWA" });
      expect((await prisma.workout.findUniqueOrThrow({ where: { id } })).workoutName).toBe("z PWA");

      const equal = await pushOk(user, [op("workout.update", { id, workoutName: "równy czas" }, server.updatedAt.toISOString())]);
      expect(equal[0]!.status).toBe("applied");

      const newer = iso(0);
      await pushOk(user, [op("workout.update", { id, workoutName: "nowsza" }, newer)]);
      const after = await prisma.workout.findUniqueOrThrow({ where: { id } });
      expect(after.workoutName).toBe("nowsza");
      expect(after.updatedAt.toISOString()).toBe(newer);
    });

    it("superseded dotyczy też pozycji, serii, ćwiczeń, planów i pominięć planu", async () => {
      const exercise = await createTestExercise(user.id, "Moje");
      const pub = await createTestExercise(null, "Global");
      const planId = uuid();
      const { id: workoutId, create } = workoutOps();
      create.workoutPlanId = planId;
      const itemId = uuid();
      const setId = uuid();
      await pushOk(user, [
        op("plan.create", { id: planId, name: "Plan", exerciseIds: [pub.id], isPublic: false }),
        create,
        op("item.add", { id: itemId, workoutId, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: setId, itemId, setNumber: 1, weight: 50, repetitions: 5 }),
      ]);
      const old = iso(-3_600_000);
      // Wszystkie te rekordy mają updatedAt "teraz-ish", więc operacje sprzed godziny przegrywają.
      const r = await pushOk(user, [
        op("item.update", { id: itemId, notes: "stare" }, old),
        op("set.update", { id: setId, weight: 1 }, old),
        op("exercise.update", { id: exercise.id, name: "Stare" }, old),
        op("plan.update", { id: planId, name: "Stary plan" }, old),
        op("workout.skipPlanExercise", { id: workoutId, exerciseId: pub.id }, old),
        op("workout.complete", { id: workoutId, durationSeconds: 1 }, old),
      ]);
      expect(statuses(r)).toEqual(Array(6).fill("superseded"));
      expect((await prisma.workoutSet.findUniqueOrThrow({ where: { id: setId } })).weight.toString()).toBe("50");
      expect((await prisma.workout.findUniqueOrThrow({ where: { id: workoutId } })).status).toBe("DRAFT");
    });

    it("usunięcie wygrywa: update usuniętego rekordu jest odrzucony jako nie istnieje", async () => {
      const { id, create } = workoutOps();
      await pushOk(user, [create]);
      await request(app).delete(`/api/workouts/${id}`).set(auth(user));
      const r = await pushOk(user, [op("workout.update", { id, workoutName: "x" })]);
      expect(r[0]).toMatchObject({ status: "rejected", code: "not_found", current: null });
    });

    it("czas z przyszłości jest obcinany do czasu serwera", async () => {
      const { id, create } = workoutOps();
      await pushOk(user, [create]);
      const before = Date.now();
      await pushOk(user, [op("workout.update", { id, workoutName: "z przyszłości" }, iso(24 * 3_600_000))]);
      const w = await prisma.workout.findUniqueOrThrow({ where: { id } });
      expect(w.workoutName).toBe("z przyszłości");
      expect(w.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(w.updatedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it("startedAt z przyszłości jest obcinany, starszy niż 30 dni odrzucany", async () => {
      const future = workoutOps(uuid(), iso(3_600_000));
      const old = workoutOps(uuid(), iso(-31 * 24 * 3_600_000));
      const ok = workoutOps(uuid(), iso(-29 * 24 * 3_600_000));
      const r = await pushOk(user, [future.create, old.create, ok.create]);
      expect(r.map((x) => [x.status, x.code])).toEqual([["applied", undefined], ["rejected", "stale_start"], ["applied", undefined]]);
      expect((await prisma.workout.findUniqueOrThrow({ where: { id: future.id } })).createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(await prisma.workout.findUnique({ where: { id: old.id } })).toBeNull();
    });
  });

  describe("odrzucenia", () => {
    it("jedna odrzucona operacja nie przerywa reszty paczki", async () => {
      const exercise = await createTestExercise(null);
      const { id, create } = workoutOps();
      const r = await pushOk(user, [
        create,
        op("item.add", { id: uuid(), workoutId: uuid(), exerciseId: exercise.id, orderInWorkout: 1 }), // brak treningu
        op("item.add", { id: uuid(), workoutId: id, exerciseId: exercise.id, orderInWorkout: 1 }),
      ]);
      expect(r.map((x) => [x.status, x.code])).toEqual([["applied", undefined], ["rejected", "not_found"], ["applied", undefined]]);
      expect(r[1]!.error).toBe("Trening nie znaleziony");
      expect(await prisma.workoutItem.count()).toBe(1);
    });

    it("walidacja: zły payload, nieznany typ, zły uuid, ujemny ciężar", async () => {
      const r = await pushOk(user, [
        op("workout.create", { id: "nie-uuid", workoutDate: iso(), startedAt: iso() }),
        op("set.add", { id: uuid(), itemId: uuid(), setNumber: 1, weight: -5, repetitions: 5 }),
        op("set.add", { id: uuid(), itemId: uuid(), setNumber: 1, weight: 10, repetitions: 0 }),
        op("plan.create", { id: uuid(), name: "ab", exerciseIds: [uuid()] }),
        op("coś.nowego", {}),
        { opId: uuid(), type: "workout.delete", at: "wczoraj", id: uuid() },
      ]);
      expect(r.map((x) => [x.status, x.code])).toEqual([
        ["rejected", "validation"],
        ["rejected", "validation"],
        ["rejected", "validation"],
        ["rejected", "validation"],
        ["rejected", "unknown_type"],
        ["rejected", "validation"],
      ]);
      expect(r[3]!.error).toContain("Name must be at least 3 characters");
    });

    it("nie znaleziono: seria, pozycja, trening, ćwiczenie", async () => {
      const r = await pushOk(user, [
        op("set.update", { id: uuid(), weight: 10 }),
        op("item.update", { id: uuid(), notes: "x" }),
        op("workout.complete", { id: uuid(), durationSeconds: 1 }),
        op("exercise.update", { id: uuid(), name: "x" }),
        op("set.add", { id: uuid(), itemId: uuid(), setNumber: 1, weight: 10, repetitions: 5 }),
      ]);
      expect(r.map((x) => x.code)).toEqual(Array(5).fill("not_found"));
      expect(r.map((x) => x.error)).toEqual([
        "Nie znaleziono serii",
        "Pozycja treningowa nie znaleziona",
        "Trening nie znaleziony",
        "Exercise not found",
        "Pozycja treningowa nie znaleziona",
      ]);
    });

    it("cudze dane: żadna operacja nie dotyka rekordów innego użytkownika", async () => {
      const exercise = await createTestExercise(null);
      const theirs = workoutOps();
      const itemId = uuid();
      const setId = uuid();
      await pushOk(other, [
        theirs.create,
        op("item.add", { id: itemId, workoutId: theirs.id, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: setId, itemId, setNumber: 1, weight: 50, repetitions: 5 }),
      ]);
      const snapshot = await prisma.workoutSet.findUniqueOrThrow({ where: { id: setId } });

      const r = await pushOk(user, [
        op("workout.update", { id: theirs.id, workoutName: "hack" }),
        op("workout.complete", { id: theirs.id, durationSeconds: 1 }),
        op("workout.delete", { id: theirs.id }),
        op("workout.skipPlanExercise", { id: theirs.id, exerciseId: exercise.id }),
        op("item.add", { id: uuid(), workoutId: theirs.id, exerciseId: exercise.id, orderInWorkout: 2 }),
        op("item.update", { id: itemId, notes: "hack" }),
        op("item.delete", { id: itemId }),
        op("set.add", { id: uuid(), itemId, setNumber: 2, weight: 1, repetitions: 1 }),
        op("set.update", { id: setId, weight: 1 }),
        op("set.delete", { id: setId }),
        op("workout.create", { id: theirs.id, workoutDate: iso(), startedAt: iso(-1000) }),
      ]);
      expect(statuses(r)).toEqual(Array(11).fill("rejected"));
      expect(r.map((x) => x.code)).toEqual(Array(11).fill("forbidden"));
      expect(r.every((x) => x.current === null)).toBe(true);
      expect(await prisma.workoutSet.findUniqueOrThrow({ where: { id: setId } })).toEqual(snapshot);
      expect((await prisma.workout.findUniqueOrThrow({ where: { id: theirs.id } })).workoutName).toBe("Push A");
      expect(await prisma.workoutItem.count()).toBe(1);
    });

    it("trening z niewidocznego planu jest odrzucony (jak POST /api/workouts)", async () => {
      const pub = await createTestExercise(null);
      const privatePlan = uuid();
      await pushOk(other, [op("plan.create", { id: privatePlan, name: "Prywatny", exerciseIds: [pub.id], isPublic: false })]);
      const w = workoutOps();
      w.create.workoutPlanId = privatePlan;
      const r = await pushOk(user, [w.create]);
      expect(r[0]).toMatchObject({ status: "rejected", code: "not_found", error: "Plan not found" });
      expect(await prisma.workout.count()).toBe(0);
    });

    it("item.add z niewidocznym ćwiczeniem jest odrzucony", async () => {
      const foreign = await createTestExercise(other.id, "Cudze");
      const { id, create } = workoutOps();
      const r = await pushOk(user, [create, op("item.add", { id: uuid(), workoutId: id, exerciseId: foreign.id, orderInWorkout: 1 })]);
      expect(r[1]).toMatchObject({ status: "rejected", code: "not_found" });
    });

    it("pominięcie ćwiczenia spoza planu i trening bez planu: komunikaty z serwisu", async () => {
      const pub = await createTestExercise(null);
      const { id, create } = workoutOps();
      const r = await pushOk(user, [create, op("workout.skipPlanExercise", { id, exerciseId: pub.id })]);
      expect(r[1]).toMatchObject({ status: "rejected", code: "bad_request", error: "Trening nie jest powiązany z planem" });
    });
  });

  describe("jeden aktywny trening", () => {
    const activeId = async () => (await get(user, "/api/workouts/active")).body.data.activeWorkoutId as string | null;

    it("starszy start z apki: oba treningi zostają, aktywny pozostaje nowszy z serwera", async () => {
      const pwa = await request(app).post("/api/workouts").set(auth(user)).send({ workoutName: "z PWA" });
      const pwaId = pwa.body.data.id as string;
      const phone = workoutOps(uuid(), iso(-3_600_000));
      const exercise = await createTestExercise(null);
      const itemId = uuid();
      const r = await pushOk(user, [
        phone.create,
        op("item.add", { id: itemId, workoutId: phone.id, exerciseId: exercise.id, orderInWorkout: 1 }),
        op("set.add", { id: uuid(), itemId, setNumber: 1, weight: 40, repetitions: 10 }),
      ]);
      expect(statuses(r)).toEqual(["applied", "applied", "applied"]);
      expect(await activeId()).toBe(pwaId);
      expect(await prisma.workout.count()).toBe(2);
      expect(await prisma.workoutSet.count()).toBe(1); // żadna seria nie ginie
      expect((await prisma.workout.findUniqueOrThrow({ where: { id: phone.id } })).status).toBe("DRAFT");
    });

    it("późniejszy start z apki staje się aktywny, wcześniejszy zostaje DRAFT-em", async () => {
      const pwa = await request(app).post("/api/workouts").set(auth(user)).send({});
      const pwaId = pwa.body.data.id as string;
      const phone = workoutOps(uuid(), iso(5_000)); // przyszłość -> obcięte do "teraz", czyli po starcie PWA
      await pushOk(user, [phone.create]);
      expect(await activeId()).toBe(phone.id);
      const old = await prisma.workout.findUniqueOrThrow({ where: { id: pwaId } });
      expect(old.status).toBe("DRAFT");
    });

    it("zakończenie starszego szkicu nie zrywa wskaźnika nowszego aktywnego treningu", async () => {
      const older = workoutOps(uuid(), iso(-7_200_000));
      const newer = workoutOps(uuid(), iso(-3_600_000));
      await pushOk(user, [older.create, newer.create]);
      expect(await activeId()).toBe(newer.id);
      await pushOk(user, [op("workout.complete", { id: older.id, durationSeconds: 100 })]);
      expect(await activeId()).toBe(newer.id);
      expect((await prisma.workout.findUniqueOrThrow({ where: { id: older.id } })).status).toBe("COMPLETED");
    });

    it("zakończenie aktywnego treningu czyści wskaźnik; trening zakończony nie blokuje nowego", async () => {
      const a = workoutOps(uuid(), iso(-7_200_000));
      await pushOk(user, [a.create, op("workout.complete", { id: a.id, durationSeconds: 1 })]);
      expect(await activeId()).toBeNull();
      const b = workoutOps(uuid(), iso(-3_600_000));
      await pushOk(user, [b.create]);
      expect(await activeId()).toBe(b.id);
    });
  });

  describe("współbieżność", () => {
    it("równoległe paczki jednego konta nie gubią zapisów ani nie zakleszczają się", async () => {
      const exercise = await createTestExercise(null);
      const batches = Array.from({ length: 6 }, () => {
        const w = workoutOps(uuid(), iso(-60_000));
        const itemId = uuid();
        return [
          w.create,
          op("item.add", { id: itemId, workoutId: w.id, exerciseId: exercise.id, orderInWorkout: 1 }),
          op("set.add", { id: uuid(), itemId, setNumber: 1, weight: 50, repetitions: 5 }),
          op("workout.complete", { id: w.id, durationSeconds: 10 }),
        ];
      });
      const responses = await Promise.all(batches.map((ops) => push(user, ops)));
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(statuses(res.body.data.results)).toEqual(Array(4).fill("applied"));
      }
      expect(await prisma.workout.count()).toBe(6);
      expect((await prisma.exerciseUserStats.findFirstOrThrow()).totalWorkouts).toBe(6);
    });
  });
});
