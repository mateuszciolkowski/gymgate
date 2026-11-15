import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestExercise, createTestUser, prisma, resetDb, tokenFor } from "../../test/db.js";
import { rebuildExerciseStatsFromCompletedWorkouts } from "./workout.service.js";

const app = createApp();

describe("reps at max weight: deterministic on weight ties", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let exerciseId: string;

  const addWorkout = async (date: string, sets: { n: number; w: number; r: number; at: number }[]) => {
    const workout = await prisma.workout.create({
      data: { userId: user.id, status: "COMPLETED", workoutDate: new Date(date) },
    });
    const item = await prisma.workoutItem.create({ data: { workoutId: workout.id, exerciseId, orderInWorkout: 1 } });
    // Inserted in an order that differs from setNumber / createdAt order.
    for (const s of [...sets].reverse()) {
      await prisma.workoutSet.create({
        data: { itemId: item.id, setNumber: s.n, weight: s.w, repetitions: s.r, createdAt: new Date(2026, 0, 1, 10, 0, s.at) },
      });
    }
    return workout;
  };

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
    exerciseId = (await createTestExercise(null)).id;
  });

  it("progression and rebuilt stats take reps from the lowest setNumber, then createdAt", async () => {
    // setNumber 1 was created last but still wins; the two setNumber 2 sets tie, createdAt decides.
    await addWorkout("2026-03-01T00:00:00.000Z", [
      { n: 2, w: 100, r: 8, at: 1 },
      { n: 1, w: 100, r: 5, at: 9 },
      { n: 3, w: 60, r: 20, at: 2 },
    ]);
    await addWorkout("2026-03-08T00:00:00.000Z", [
      { n: 1, w: 90, r: 10, at: 5 },
      { n: 2, w: 100, r: 7, at: 4 },
      { n: 2, w: 100, r: 3, at: 3 },
    ]);

    const res = await request(app)
      .get(`/api/workouts/stats/progression/${exerciseId}`)
      .set({ Authorization: `Bearer ${tokenFor(user)}` });
    expect(res.status).toBe(200);
    expect(res.body.data.points.map((p: { repetitionsAtMaxSet: number }) => p.repetitionsAtMaxSet)).toEqual([5, 3]);

    await rebuildExerciseStatsFromCompletedWorkouts(user.id, exerciseId);
    const stats = await prisma.exerciseUserStats.findUniqueOrThrow({ where: { userId_exerciseId: { userId: user.id, exerciseId } } });
    expect(Number(stats.maxWeight)).toBe(100);
    expect(stats.maxWeightReps).toBe(5); // earliest workout holding the max
    expect(stats.lastReps).toBe(3);
  });
});
