import { randomUUID as uuid } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestExercise, createTestUser, prisma, resetDb, tokenFor } from "../../test/db.js";

/** Backward-compatible fixes for the bugs found in the PWA inventory (B1, B2, B8). */

const app = createApp();
type User = Awaited<ReturnType<typeof createTestUser>>;
const auth = (u: User) => ({ Authorization: `Bearer ${tokenFor(u)}` });

describe("bug fixes", () => {
  let user: User;
  let other: User;

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
    other = await createTestUser();
  });

  describe("B1: PATCH /api/workouts/:id accepts a date-only workoutDate", () => {
    const makeWorkout = async () =>
      (await request(app).post("/api/workouts").set(auth(user)).send({ workoutName: "Stary" })).body.data as { id: string };

    it("request wysyłany przez modal PWA (sama data + nazwa, siłownia, czas) zapisuje wszystkie pola", async () => {
      const w = await makeWorkout();
      const res = await request(app)
        .patch(`/api/workouts/${w.id}`)
        .set(auth(user))
        .send({ workoutName: "Nowy", gymName: "Siłownia", workoutDate: "2026-03-01", durationSeconds: 3600 });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect(res.body.data).toMatchObject({ workoutName: "Nowy", gymName: "Siłownia", durationSeconds: 3600 });
      expect(res.body.data.workoutDate).toBe("2026-03-01T00:00:00.000Z");
      const stored = await prisma.workout.findUnique({ where: { id: w.id } });
      expect(stored?.workoutDate.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    });

    it("pełny znacznik czasu nadal działa, a śmieci nadal dają 400", async () => {
      const w = await makeWorkout();
      const ok = await request(app).patch(`/api/workouts/${w.id}`).set(auth(user)).send({ workoutDate: "2026-03-02T10:15:00.000Z" });
      expect(ok.status).toBe(200);
      expect(ok.body.data.workoutDate).toBe("2026-03-02T10:15:00.000Z");
      for (const bad of ["02.03.2026", "2026-3-2", "2026-03-02 10:00", "jutro"]) {
        const res = await request(app).patch(`/api/workouts/${w.id}`).set(auth(user)).send({ workoutDate: bad });
        expect(res.status, bad).toBe(400);
      }
    });

    it("POST /api/workouts nadal wymaga pełnego znacznika (bez zmian)", async () => {
      const res = await request(app).post("/api/workouts").set(auth(user)).send({ workoutDate: "2026-03-01" });
      expect(res.status).toBe(400);
    });
  });

  describe("B2: exercises do not expose the creator's password hash", () => {
    it("GET /api/exercises i /:id zwracają tylko id, imię, nazwisko i e-mail twórcy", async () => {
      const own = await createTestExercise(user.id, "Własne");
      const global = await createTestExercise(null, "Globalne");

      const list = await request(app).get("/api/exercises").set(auth(user));
      expect(list.status).toBe(200);
      expect(JSON.stringify(list.body)).not.toMatch(/password|\$2[aby]\$/);
      const ownRow = list.body.data.find((e: { id: string }) => e.id === own.id);
      expect(ownRow.creator).toEqual({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email });
      expect(list.body.data.find((e: { id: string }) => e.id === global.id).creator).toBeNull();

      const one = await request(app).get(`/api/exercises/${own.id}`).set(auth(user));
      expect(one.status).toBe(200);
      expect(JSON.stringify(one.body)).not.toMatch(/password|\$2[aby]\$/);
      expect(one.body.data.creator).toEqual({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email });
    });
  });

  describe("B8: PATCH /api/workouts/sets/:setId checks permissions before writing", () => {
    const setOf = async (owner: User) => {
      const ex = await createTestExercise(null);
      const w = await prisma.workout.create({ data: { userId: owner.id } });
      const item = await prisma.workoutItem.create({ data: { workoutId: w.id, exerciseId: ex.id, orderInWorkout: 1 } });
      return prisma.workoutSet.create({
        data: { itemId: item.id, setNumber: 1, weight: 50, repetitions: 5, updatedAt: new Date("2026-01-01T00:00:00.000Z") },
      });
    };

    it("cudza seria: 403 i updatedAt nie jest podbijany", async () => {
      const set = await setOf(other);
      const res = await request(app).patch(`/api/workouts/sets/${set.id}`).set(auth(user)).send({ weight: 99 });
      expect(res.status).toBe(403);
      const after = await prisma.workoutSet.findUnique({ where: { id: set.id } });
      expect(after?.updatedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(after?.weight.toString()).toBe("50");
    });

    it("nieistniejąca seria: 404 (nie 500)", async () => {
      const res = await request(app).patch(`/api/workouts/sets/${uuid()}`).set(auth(user)).send({ weight: 99 });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("własna seria nadal się edytuje", async () => {
      const set = await setOf(user);
      const res = await request(app).patch(`/api/workouts/sets/${set.id}`).set(auth(user)).send({ weight: 55, repetitions: 6 });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ weight: "55", repetitions: 6 });
    });
  });
});
