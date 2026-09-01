import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  workoutSetDeleteManyMock,
  workoutItemDeleteManyMock,
  workoutDeleteMock,
  transactionMock,
  workoutSetFindManyMock,
  workoutItemFindFirstMock,
} = vi.hoisted(() => ({
  workoutSetDeleteManyMock: vi.fn(),
  workoutItemDeleteManyMock: vi.fn(),
  workoutDeleteMock: vi.fn(),
  transactionMock: vi.fn(),
  workoutSetFindManyMock: vi.fn(),
  workoutItemFindFirstMock: vi.fn(),
}));

vi.mock("../../config/database.js", () => ({
  default: {
    $transaction: transactionMock,
    workoutSet: { findMany: workoutSetFindManyMock },
    workoutItem: { findFirst: workoutItemFindFirstMock },
  },
}));

import * as workoutRepository from "./workout.repository.js";

describe("workout.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleteWorkout: removes workout sets, workout items and workout in one transaction", async () => {
    workoutSetDeleteManyMock.mockResolvedValue({ count: 3 });
    workoutItemDeleteManyMock.mockResolvedValue({ count: 2 });
    workoutDeleteMock.mockResolvedValue({ id: "w1" });

    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        workoutSet: { deleteMany: workoutSetDeleteManyMock },
        workoutItem: { deleteMany: workoutItemDeleteManyMock },
        workout: { delete: workoutDeleteMock },
      }),
    );

    const result = await workoutRepository.deleteWorkout("w1");

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(workoutSetDeleteManyMock).toHaveBeenCalledWith({
      where: { item: { workoutId: "w1" } },
    });
    expect(workoutItemDeleteManyMock).toHaveBeenCalledWith({
      where: { workoutId: "w1" },
    });
    expect(workoutDeleteMock).toHaveBeenCalledWith({ where: { id: "w1" } });

    const setsCallOrder = workoutSetDeleteManyMock.mock.invocationCallOrder[0];
    const itemsCallOrder = workoutItemDeleteManyMock.mock.invocationCallOrder[0];
    const workoutCallOrder = workoutDeleteMock.mock.invocationCallOrder[0];

    expect(setsCallOrder).toBeLessThan(itemsCallOrder);
    expect(itemsCallOrder).toBeLessThan(workoutCallOrder);
    expect(result).toEqual({ id: "w1" });
  });

  describe("getExerciseProgression", () => {
    it("orders by workoutDate then createdAt, so same-day workouts are tie-broken deterministically", async () => {
      workoutSetFindManyMock.mockResolvedValue([]);

      await workoutRepository.getExerciseProgression("u1", "e1");

      expect(workoutSetFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { item: { workout: { workoutDate: "asc" } } },
            { item: { workout: { createdAt: "asc" } } },
          ],
        }),
      );
    });

    it("keeps the query's tie-broken order for same-day workouts (last point is the actually-later one)", async () => {
      // Both workouts share the same workoutDate (date-only field, no time-of-day).
      // The repo's orderBy (workoutDate asc, createdAt asc) is what the DB uses to
      // decide which one comes last; this mock simulates that DB ordering having
      // already put the earlier-created workout (w-morning) before the
      // later-created one (w-evening) despite the identical workoutDate.
      const sameDay = new Date("2026-08-30T00:00:00.000Z");
      workoutSetFindManyMock.mockResolvedValue([
        {
          weight: "50",
          repetitions: 8,
          item: { workout: { id: "w-morning", workoutDate: sameDay } },
        },
        {
          weight: "80",
          repetitions: 5,
          item: { workout: { id: "w-evening", workoutDate: sameDay } },
        },
      ]);

      const progression = await workoutRepository.getExerciseProgression("u1", "e1");

      expect(progression).toHaveLength(2);
      expect(progression[progression.length - 1]!.workoutId).toBe("w-evening");
      expect(progression[progression.length - 1]!.maxSetWeight).toBe(80);
    });
  });

  describe("getLastWorkoutNote", () => {
    it("orders by workoutDate then createdAt (desc) to pick the truly last same-day workout", async () => {
      workoutItemFindFirstMock.mockResolvedValue({ notes: "last note" });

      const note = await workoutRepository.getLastWorkoutNote("u1", "e1");

      expect(workoutItemFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { workout: { workoutDate: "desc" } },
            { workout: { createdAt: "desc" } },
          ],
        }),
      );
      expect(note).toBe("last note");
    });
  });
});
