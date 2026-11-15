import { randomUUID as uuid } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestExercise, createTestUser, prisma, resetDb, TEST_PASSWORD, tokenFor } from "../../test/db.js";

/** DELETE /api/auth/account: the user and ALL their data go in one step; everybody else's data stays. */

const app = createApp();
type User = Awaited<ReturnType<typeof createTestUser>>;
const auth = (u: User) => ({ Authorization: `Bearer ${tokenFor(u)}` });
const del = (u: User, body: object = { password: TEST_PASSWORD }) =>
  request(app).delete("/api/auth/account").set(auth(u)).send(body);

/** Row counts of every user-owned table for one user. */
const footprint = async (userId: string) => ({
  user: await prisma.user.count({ where: { id: userId } }),
  exercises: await prisma.exercise.count({ where: { creatorUserId: userId } }),
  workouts: await prisma.workout.count({ where: { userId } }),
  items: await prisma.workoutItem.count({ where: { workout: { userId } } }),
  sets: await prisma.workoutSet.count({ where: { item: { workout: { userId } } } }),
  stats: await prisma.exerciseUserStats.count({ where: { userId } }),
  pendingNotes: await prisma.exercisePendingNote.count({ where: { userId } }),
  plans: await prisma.workoutPlan.count({ where: { creatorUserId: userId } }),
  favorites: await prisma.userFavoritePlan.count({ where: { userId } }),
  syncOperations: await prisma.syncOperation.count({ where: { userId } }),
  refreshTokens: await prisma.refreshToken.count({ where: { userId } }),
});

/** A user with data in every table the account owns. */
const populate = async (u: User, global: { id: string }, builtin: { id: string }) => {
  const own = await createTestExercise(u.id, "Prywatne");
  const workout = await prisma.workout.create({ data: { userId: u.id, status: "COMPLETED", workoutName: "T" } });
  const item = await prisma.workoutItem.create({ data: { workoutId: workout.id, exerciseId: own.id, orderInWorkout: 1 } });
  await prisma.workoutSet.create({ data: { itemId: item.id, setNumber: 1, weight: 50, repetitions: 5 } });
  const item2 = await prisma.workoutItem.create({ data: { workoutId: workout.id, exerciseId: global.id, orderInWorkout: 2 } });
  await prisma.workoutSet.create({ data: { itemId: item2.id, setNumber: 1, weight: 60, repetitions: 5 } });
  await prisma.exerciseUserStats.create({
    data: { userId: u.id, exerciseId: global.id, maxWeight: 60, maxWeightReps: 5, maxWeightDate: new Date(), lastWeight: 60, lastReps: 5, lastWorkoutDate: new Date() },
  });
  await prisma.exercisePendingNote.create({ data: { userId: u.id, exerciseId: global.id, note: "n" } });
  await prisma.workoutPlan.create({ data: { name: "Prywatny", creatorUserId: u.id, items: { create: [{ exerciseId: own.id, orderInPlan: 0 }] } } });
  const publicPlan = await prisma.workoutPlan.create({
    data: { name: "Publiczny", creatorUserId: u.id, isPublic: true, items: { create: [{ exerciseId: global.id, orderInPlan: 0 }] } },
  });
  await prisma.userFavoritePlan.create({ data: { userId: u.id, planId: builtin.id } });
  await prisma.syncOperation.create({ data: { opId: uuid(), userId: u.id, deviceId: "d", type: "workout.delete", status: "applied", result: {} } });
  await prisma.refreshToken.create({ data: { userId: u.id, familyId: uuid(), tokenHash: uuid(), deviceId: "d", expiresAt: new Date(Date.now() + 1e9) } });
  return { publicPlan, workout };
};

describe("DELETE /api/auth/account", () => {
  let user: User;
  let other: User;
  let global: { id: string };
  let builtin: { id: string };

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
    other = await createTestUser();
    global = await createTestExercise(null, "Globalne");
    builtin = await prisma.workoutPlan.create({
      data: { name: "Wbudowany", creatorUserId: null, isPublic: true, items: { create: [{ exerciseId: global.id, orderInPlan: 0 }] } },
    });
  });

  it("401 bez tokenu; 400 bez hasła; nic nie jest usuwane", async () => {
    await populate(user, global, builtin);
    const before = await footprint(user.id);
    expect((await request(app).delete("/api/auth/account").send({ password: TEST_PASSWORD })).status).toBe(401);
    expect((await del(user, {})).status).toBe(400);
    expect((await request(app).delete("/api/auth/account").set(auth(user))).status).toBe(400); // no body at all
    expect(await footprint(user.id)).toEqual(before);
  });

  it("zle hasło: 403 z polskim komunikatem i nic nie jest usuwane", async () => {
    await populate(user, global, builtin);
    const before = await footprint(user.id);
    const res = await del(user, { password: "zle-haslo" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: "Nieprawidłowe hasło" });
    expect(await footprint(user.id)).toEqual(before);
    expect(before.user).toBe(1);
  });

  it("usuwa użytkownika i wszystkie jego dane w każdej tabeli", async () => {
    await populate(user, global, builtin);
    const before = await footprint(user.id);
    expect(Object.values(before).every((n) => n > 0)).toBe(true);

    const res = await del(user);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null });

    expect(Object.values(await footprint(user.id)).every((n) => n === 0)).toBe(true);
    // Nothing orphaned from the cascades.
    expect(await prisma.workoutItem.count()).toBe(0);
    expect(await prisma.workoutSet.count()).toBe(0);
    expect(await prisma.workoutPlan.count({ where: { creatorUserId: { not: null } } })).toBe(0);
    expect(await prisma.workoutPlanItem.count({ where: { plan: { creatorUserId: user.id } } })).toBe(0);
  });

  it("po usunięciu użytkownik nie istnieje: /me daje 404 (jak dotąd), a logowanie (PWA i mobilne) i odświeżanie są niemożliwe", async () => {
    await del(user);
    expect((await request(app).get("/api/auth/me").set(auth(user))).status).toBe(404);
    for (const url of ["/api/auth/login", "/api/auth/mobile/login"]) {
      const res = await request(app).post(url).send({ email: user.email, password: TEST_PASSWORD });
      expect(res.status).toBe(401);
    }
    expect((await del(user)).status).toBe(401); // second call: user no longer exists
  });

  it("dane innych użytkowników, ćwiczenia globalne i plany wbudowane zostają", async () => {
    await populate(user, global, builtin);
    const { workout: otherWorkout } = await populate(other, global, builtin);
    const otherBefore = await footprint(other.id);

    expect((await del(user)).status).toBe(200);

    expect(await footprint(other.id)).toEqual(otherBefore);
    expect(await prisma.workout.findUnique({ where: { id: otherWorkout.id } })).not.toBeNull();
    expect(await prisma.exercise.findUnique({ where: { id: global.id } })).not.toBeNull();
    const plan = await prisma.workoutPlan.findUnique({ where: { id: builtin.id }, include: { items: true } });
    expect(plan?.items).toHaveLength(1);
    expect(await prisma.workoutPlan.count({ where: { creatorUserId: null } })).toBe(1);
  });

  it("publiczny plan usuniętego użytkownika, ulubiony i użyty przez innych, niczego u nich nie psuje", async () => {
    const { publicPlan } = await populate(user, global, builtin);
    await prisma.userFavoritePlan.create({ data: { userId: other.id, planId: publicPlan.id } });
    const otherWorkout = await prisma.workout.create({ data: { userId: other.id, workoutPlanId: publicPlan.id, workoutName: "Z cudzego planu" } });
    const pull = (qs = "") => request(app).get(`/api/sync/pull${qs}`).set(auth(other));
    const snap = (await pull()).body.data;
    expect(snap.upserts.plans.map((p: { id: string }) => p.id)).toContain(publicPlan.id);

    expect((await del(user)).status).toBe(200);

    // The favorite is gone with the plan; the workout stays and just loses the plan reference.
    expect(await prisma.userFavoritePlan.count({ where: { userId: other.id, planId: publicPlan.id } })).toBe(0);
    expect(await prisma.workout.findUnique({ where: { id: otherWorkout.id } })).toMatchObject({ workoutPlanId: null, userId: other.id });
    // Old endpoints keep working for the other user.
    for (const url of ["/api/plans?tab=community", "/api/plans?tab=builtin", "/api/plans?tab=mine", "/api/workouts", `/api/workouts/${otherWorkout.id}`, "/api/exercises"]) {
      const res = await request(app).get(url).set(auth(other));
      expect(res.status, url).toBe(200);
    }
    // Sync: the other user is told the plan is gone, and the workout lost its plan.
    const inc = (await pull(`?cursor=${snap.cursor}`)).body.data;
    expect(inc.deletes).toContainEqual({ entity: "plan", id: publicPlan.id });
    expect(inc.upserts.workouts).toEqual([expect.objectContaining({ id: otherWorkout.id, workoutPlanId: null })]);
    const fresh = (await pull()).body.data;
    expect(fresh.upserts.plans.map((p: { id: string }) => p.id)).toEqual([builtin.id]);
  });

  it("konto o historycznym id '1' (właściciel katalogu globalnego) nie może zostać usunięte", async () => {
    const legacy = await createTestUser({ id: "1" });
    await createTestExercise("1", "Z katalogu");
    const res = await del(legacy);
    expect(res.status).toBe(403);
    expect(await prisma.exercise.count({ where: { creatorUserId: "1" } })).toBe(1);
    expect(await prisma.user.count({ where: { id: "1" } })).toBe(1);
  });
});
