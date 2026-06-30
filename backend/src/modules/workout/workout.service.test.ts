import { beforeEach, describe, expect, it, vi } from "vitest";
import * as workoutService from "./workout.service.js";
import * as workoutRepo from "./workout.repository.js";

vi.mock("./workout.repository.js", () => ({
  getActiveWorkout: vi.fn(),
  findWorkoutById: vi.fn(),
  createWorkout: vi.fn(),
  createWorkoutWithActiveGuard: vi.fn(),
  setActiveWorkout: vi.fn(),
  findWorkoutsByUser: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  clearActiveWorkout: vi.fn(),
  getExerciseStats: vi.fn(),
  upsertExerciseStats: vi.fn(),
  getStatsOverview: vi.fn(),
  getExerciseProgression: vi.fn(),
  getLastWorkoutNote: vi.fn(),
  deleteExerciseStats: vi.fn(),
  getMaxOrderInWorkout: vi.fn(),
  addExerciseToWorkout: vi.fn(),
  addExerciseToWorkoutWithPendingNote: vi.fn(),
  addSetToWorkoutItem: vi.fn(),
  findWorkoutItemById: vi.fn(),
  deleteWorkoutItem: vi.fn(),
  updateWorkoutItem: vi.fn(),
  getMaxSetNumber: vi.fn(),
  findWorkoutSetById: vi.fn(),
  updateWorkoutSet: vi.fn(),
  deleteWorkoutSet: vi.fn(),
  getAllUserStats: vi.fn(),
  setPendingExerciseNote: vi.fn(),
  clearPendingExerciseNote: vi.fn(),
  findWorkoutWithPlan: vi.fn(),
  setSkippedPlanExerciseIds: vi.fn(),
}));

describe("workout.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workoutRepo.getLastWorkoutNote).mockResolvedValue(null);
  });

  it("createWorkout: reuses active workout returned by the race-safe guard", async () => {
    vi.mocked(workoutRepo.createWorkoutWithActiveGuard).mockResolvedValue({
      workout: { id: "w1", userId: "u1", status: "DRAFT" } as any,
      reused: true,
    });

    const result = await workoutService.createWorkout("u1", {});

    expect(result).toEqual({ id: "w1", userId: "u1", status: "DRAFT" });
    expect(workoutRepo.createWorkoutWithActiveGuard).toHaveBeenCalledTimes(1);
    // Legacy non-atomic path must not be used anymore.
    expect(workoutRepo.createWorkout).not.toHaveBeenCalled();
    expect(workoutRepo.setActiveWorkout).not.toHaveBeenCalled();
  });

  it("createWorkout: creates a new workout via the race-safe guard when none is active", async () => {
    vi.mocked(workoutRepo.createWorkoutWithActiveGuard).mockResolvedValue({
      workout: { id: "w-new", userId: "u1", status: "DRAFT" } as any,
      reused: false,
    });

    const result = await workoutService.createWorkout("u1", {
      workoutName: "Push Day",
      gymName: "Gym A",
    });

    expect(workoutRepo.createWorkoutWithActiveGuard).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        workoutName: "Push Day",
        gymName: "Gym A",
        user: { connect: { id: "u1" } },
      }),
    );
    expect(workoutRepo.createWorkout).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "w-new", userId: "u1", status: "DRAFT" });
  });

  it("getWorkoutById: throws when workout belongs to another user", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u2",
    } as any);

    await expect(workoutService.getWorkoutById("w1", "u1")).rejects.toThrow(
      "Brak uprawnień do tego treningu",
    );
  });

  it("updateWorkout: on transition to COMPLETED recalculates stats and clears active workout", async () => {
    const workoutDate = new Date("2026-01-10T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "DRAFT",
      workoutDate,
      items: [{ exerciseId: "e1" }],
    } as any);

    vi.mocked(workoutRepo.updateWorkout).mockResolvedValue({
      id: "w1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([
      {
        workoutId: "w1",
        workoutDate,
        maxSetWeight: 85,
        repetitionsAtMaxSet: 3,
        volume: 1400,
      },
    ] as any);

    const result = await workoutService.updateWorkout("w1", "u1", {
      status: "COMPLETED",
    });

    expect(result).toEqual({ id: "w1", status: "COMPLETED" });
    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith(
      "u1",
      "e1",
      {
        maxWeight: 85,
        maxWeightReps: 3,
        maxWeightDate: workoutDate,
        lastWeight: 85,
        lastReps: 3,
        lastWorkoutDate: workoutDate,
        totalWorkouts: 1,
        lastNote: null,
      },
    );
    expect(workoutRepo.clearPendingExerciseNote).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.clearActiveWorkout).toHaveBeenCalledWith("u1");
  });

  it("updateWorkout: on transition from COMPLETED to DRAFT recalculates stats and does not clear active workout", async () => {
    const workoutDate = new Date("2026-01-10T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
      workoutDate,
      items: [{ exerciseId: "e1" }],
    } as any);
    vi.mocked(workoutRepo.updateWorkout).mockResolvedValue({
      id: "w1",
      status: "DRAFT",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.updateWorkout("w1", "u1", {
      status: "DRAFT",
    });

    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.clearActiveWorkout).not.toHaveBeenCalled();
  });

  it("deleteWorkout: deletes workout after ownership check", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "DRAFT",
      items: [],
    } as any);
    vi.mocked(workoutRepo.deleteWorkout).mockResolvedValue({
      id: "w1",
    } as any);

    const result = await workoutService.deleteWorkout("w1", "u1");

    expect(workoutRepo.deleteWorkout).toHaveBeenCalledWith("w1");
    expect(workoutRepo.getExerciseProgression).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "w1" });
  });

  it("deleteWorkout: recalculates stats for affected exercises regardless of workout status", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "DRAFT",
      items: [{ exerciseId: "e1" }],
    } as any);
    vi.mocked(workoutRepo.deleteWorkout).mockResolvedValue({ id: "w1" } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.deleteWorkout("w1", "u1");

    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e1");
  });

  it("deleteWorkout: for COMPLETED workout recalculates stats for affected exercises", async () => {
    const workoutDate1 = new Date("2026-01-01T10:00:00.000Z");
    const workoutDate2 = new Date("2026-01-10T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
      items: [
        { exerciseId: "e1" },
        { exerciseId: "e1" },
        { exerciseId: "e2" },
      ],
    } as any);
    vi.mocked(workoutRepo.deleteWorkout).mockResolvedValue({ id: "w1" } as any);
    vi.mocked(workoutRepo.getExerciseProgression)
      .mockResolvedValueOnce([
        {
          workoutId: "w-old",
          workoutDate: workoutDate1,
          maxSetWeight: 85,
          repetitionsAtMaxSet: 6,
          volume: 2200,
        },
        {
          workoutId: "w-latest",
          workoutDate: workoutDate2,
          maxSetWeight: 80,
          repetitionsAtMaxSet: 8,
          volume: 2000,
        },
      ] as any)
      .mockResolvedValueOnce([]);

    await workoutService.deleteWorkout("w1", "u1");

    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e2");
    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith("u1", "e1", {
      maxWeight: 85,
      maxWeightReps: 6,
      maxWeightDate: workoutDate1,
      lastWeight: 80,
      lastReps: 8,
      lastWorkoutDate: workoutDate2,
      totalWorkouts: 2,
      lastNote: null,
    });
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e2");
  });

  it("addExerciseToWorkout: auto-assigns order without creating a default set", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
    } as any);
    vi.mocked(workoutRepo.getMaxOrderInWorkout).mockResolvedValue(2);
    vi.mocked(workoutRepo.addExerciseToWorkoutWithPendingNote).mockResolvedValue({
      id: "item-1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
    } as any);

    const result = await workoutService.addExerciseToWorkout("w1", "u1", {
      exerciseId: "e1",
    });

    expect(workoutRepo.addExerciseToWorkoutWithPendingNote).toHaveBeenCalledWith(
      "w1",
      "u1",
      "e1",
      3,
      undefined,
    );
    expect(workoutRepo.addSetToWorkoutItem).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "item-1", workoutId: "w1" });
  });

  it("updateWorkoutItem: recalculates stats after note change in completed workout", async () => {
    const workoutDate = new Date("2026-03-10T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
      notes: "stara notatka",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.updateWorkoutItem).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      notes: "nowa notatka",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([
      {
        workoutId: "w1",
        workoutDate,
        maxSetWeight: 90,
        repetitionsAtMaxSet: 5,
        volume: 1800,
      },
    ] as any);
    vi.mocked(workoutRepo.getLastWorkoutNote).mockResolvedValue("nowa notatka");

    await workoutService.updateWorkoutItem("item-1", "u1", {
      notes: "nowa notatka",
    });

    expect(workoutRepo.updateWorkoutItem).toHaveBeenCalledWith("item-1", {
      notes: "nowa notatka",
    });
    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith("u1", "e1", {
      maxWeight: 90,
      maxWeightReps: 5,
      maxWeightDate: workoutDate,
      lastWeight: 90,
      lastReps: 5,
      lastWorkoutDate: workoutDate,
      totalWorkouts: 1,
      lastNote: "nowa notatka",
    });
    expect(workoutRepo.setPendingExerciseNote).toHaveBeenCalledWith(
      "u1",
      "e1",
      "nowa notatka",
    );
  });

  it("updateWorkoutItem: clears pending note when completed workout note becomes empty", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
      notes: "stara notatka",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.updateWorkoutItem).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      notes: "",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.updateWorkoutItem("item-1", "u1", {
      notes: "   ",
    });

    expect(workoutRepo.clearPendingExerciseNote).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.setPendingExerciseNote).not.toHaveBeenCalled();
  });

  it("updateWorkoutItem: updates pending note even when workout is DRAFT", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
      notes: "stara notatka",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "DRAFT",
    } as any);
    vi.mocked(workoutRepo.updateWorkoutItem).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      notes: "skup sie na tempie",
    } as any);

    await workoutService.updateWorkoutItem("item-1", "u1", {
      notes: "skup sie na tempie",
    });

    expect(workoutRepo.setPendingExerciseNote).toHaveBeenCalledWith(
      "u1",
      "e1",
      "skup sie na tempie",
    );
    expect(workoutRepo.getExerciseProgression).not.toHaveBeenCalled();
  });

  it("addSetToWorkoutItem: computes next setNumber when omitted", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
    } as any);
    vi.mocked(workoutRepo.getMaxSetNumber).mockResolvedValue(4);
    vi.mocked(workoutRepo.addSetToWorkoutItem).mockResolvedValue({
      id: "set-5",
      setNumber: 5,
    } as any);

    const result = await workoutService.addSetToWorkoutItem("item-1", "u1", {
      weight: 60,
      repetitions: 8,
    });

    expect(workoutRepo.addSetToWorkoutItem).toHaveBeenCalledWith(
      "item-1",
      60,
      8,
      5,
    );
    expect(result).toEqual({ id: "set-5", setNumber: 5 });
  });

  it("addSetToWorkoutItem: recalculates stats for completed workouts", async () => {
    const workoutDate = new Date("2026-01-12T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.getMaxSetNumber).mockResolvedValue(2);
    vi.mocked(workoutRepo.addSetToWorkoutItem).mockResolvedValue({
      id: "set-3",
      setNumber: 3,
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([
      {
        workoutId: "w1",
        workoutDate,
        maxSetWeight: 100,
        repetitionsAtMaxSet: 3,
        volume: 900,
      },
    ] as any);

    await workoutService.addSetToWorkoutItem("item-1", "u1", {
      weight: 100,
      repetitions: 3,
    });

    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith("u1", "e1", {
      maxWeight: 100,
      maxWeightReps: 3,
      maxWeightDate: workoutDate,
      lastWeight: 100,
      lastReps: 3,
      lastWorkoutDate: workoutDate,
      totalWorkouts: 1,
      lastNote: null,
    });
  });

  it("updateWorkoutSet: recalculates stats for completed workouts", async () => {
    const workoutDate = new Date("2026-02-11T10:00:00.000Z");

    vi.mocked(workoutRepo.updateWorkoutSet)
      .mockResolvedValueOnce({ id: "set-1", itemId: "item-1" } as any)
      .mockResolvedValueOnce({ id: "set-1", itemId: "item-1" } as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([
      {
        workoutId: "w1",
        workoutDate,
        maxSetWeight: 95,
        repetitionsAtMaxSet: 5,
        volume: 1900,
      },
    ] as any);

    await workoutService.updateWorkoutSet("set-1", "u1", { weight: 95 });

    expect(workoutRepo.updateWorkoutSet).toHaveBeenNthCalledWith(1, "set-1", {});
    expect(workoutRepo.updateWorkoutSet).toHaveBeenNthCalledWith(2, "set-1", {
      weight: 95,
    });
    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith("u1", "e1", {
      maxWeight: 95,
      maxWeightReps: 5,
      maxWeightDate: workoutDate,
      lastWeight: 95,
      lastReps: 5,
      lastWorkoutDate: workoutDate,
      totalWorkouts: 1,
      lastNote: null,
    });
  });

  it("getActiveWorkoutId: returns id when active workout exists and is DRAFT", async () => {
    vi.mocked(workoutRepo.getActiveWorkout).mockResolvedValue({
      activeWorkoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      status: "DRAFT",
    } as any);

    const result = await workoutService.getActiveWorkoutId("u1");

    expect(result).toBe("w1");
    expect(workoutRepo.clearActiveWorkout).not.toHaveBeenCalled();
  });

  it("getActiveWorkoutId: self-heals stale pointer to a COMPLETED workout", async () => {
    vi.mocked(workoutRepo.getActiveWorkout).mockResolvedValue({
      activeWorkoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      status: "COMPLETED",
    } as any);

    const result = await workoutService.getActiveWorkoutId("u1");

    expect(result).toBeNull();
    expect(workoutRepo.clearActiveWorkout).toHaveBeenCalledWith("u1");
  });

  it("getActiveWorkoutId: self-heals pointer to a missing workout", async () => {
    vi.mocked(workoutRepo.getActiveWorkout).mockResolvedValue({
      activeWorkoutId: "w-gone",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue(null as any);

    const result = await workoutService.getActiveWorkoutId("u1");

    expect(result).toBeNull();
    expect(workoutRepo.clearActiveWorkout).toHaveBeenCalledWith("u1");
  });

  it("getStatsOverview: returns aggregated stats from repository", async () => {
    vi.mocked(workoutRepo.getStatsOverview).mockResolvedValue({
      workoutsLastMonth: 3,
      workoutsLastYear: 22,
      totalSets: 240,
      totalVolume: 18540,
    });

    const result = await workoutService.getStatsOverview("u1");

    expect(workoutRepo.getStatsOverview).toHaveBeenCalledWith("u1");
    expect(result).toEqual({
      workoutsLastMonth: 3,
      workoutsLastYear: 22,
      totalSets: 240,
      totalVolume: 18540,
    });
  });

  it("getExerciseProgression: maps selected metric to chart value", async () => {
    const workoutDate = new Date("2026-02-02T10:00:00.000Z");

    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([
      {
        workoutId: "w1",
        workoutDate,
        maxSetWeight: 90,
        repetitionsAtMaxSet: 5,
        volume: 1800,
      },
    ]);

    const result = await workoutService.getExerciseProgression("u1", "e1", {
      metric: "volume",
    });

    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e1", {
      from: undefined,
      to: undefined,
    });
    expect(result).toEqual({
      exerciseId: "e1",
      metric: "volume",
      points: [
        {
          workoutId: "w1",
          workoutDate,
          maxSetWeight: 90,
          repetitionsAtMaxSet: 5,
          volume: 1800,
          value: 1800,
        },
      ],
    });
  });

  it("getWorkoutById: throws not-found when workout is missing", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue(null as any);

    await expect(workoutService.getWorkoutById("missing", "u1")).rejects.toThrow(
      /nie znaleziony/,
    );
  });

  it("addExerciseToWorkout: rebuilds stats when adding to a COMPLETED workout", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.getMaxOrderInWorkout).mockResolvedValue(0);
    vi.mocked(workoutRepo.addExerciseToWorkoutWithPendingNote).mockResolvedValue({
      id: "item-1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.addExerciseToWorkout("w1", "u1", { exerciseId: "e1" });

    expect(workoutRepo.getExerciseProgression).toHaveBeenCalledWith("u1", "e1");
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e1");
  });

  it("deleteWorkoutItem: rejects when caller is not the owner", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "other",
      status: "DRAFT",
    } as any);

    await expect(
      workoutService.deleteWorkoutItem("item-1", "u1"),
    ).rejects.toThrow(/uprawnień/);
    expect(workoutRepo.deleteWorkoutItem).not.toHaveBeenCalled();
  });

  it("deleteWorkoutItem: deletes and rebuilds stats for a COMPLETED workout", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.deleteWorkoutItem).mockResolvedValue({ id: "item-1" } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.deleteWorkoutItem("item-1", "u1");

    expect(workoutRepo.deleteWorkoutItem).toHaveBeenCalledWith("item-1");
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e1");
  });

  it("addSetToWorkoutItem: rejects when caller is not the owner", async () => {
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "other",
    } as any);

    await expect(
      workoutService.addSetToWorkoutItem("item-1", "u1", { weight: 10, repetitions: 5 }),
    ).rejects.toThrow(/uprawnień/);
    expect(workoutRepo.addSetToWorkoutItem).not.toHaveBeenCalled();
  });

  it("deleteWorkoutSet: deletes the set and rebuilds stats for a COMPLETED workout", async () => {
    vi.mocked(workoutRepo.findWorkoutSetById).mockResolvedValue({
      id: "set-1",
      itemId: "item-1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
      exerciseId: "e1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.deleteWorkoutSet).mockResolvedValue({ id: "set-1" } as any);
    vi.mocked(workoutRepo.getExerciseProgression).mockResolvedValue([]);

    await workoutService.deleteWorkoutSet("set-1", "u1");

    expect(workoutRepo.deleteWorkoutSet).toHaveBeenCalledWith("set-1");
    expect(workoutRepo.deleteExerciseStats).toHaveBeenCalledWith("u1", "e1");
  });

  it("deleteWorkoutSet: throws when the set does not exist", async () => {
    vi.mocked(workoutRepo.findWorkoutSetById).mockResolvedValue(null as any);

    await expect(workoutService.deleteWorkoutSet("gone", "u1")).rejects.toThrow(
      /Nie znaleziono serii/,
    );
  });

  it("clearActiveWorkout: delegates to the repository", async () => {
    await workoutService.clearActiveWorkout("u1");
    expect(workoutRepo.clearActiveWorkout).toHaveBeenCalledWith("u1");
  });

  it("getAllUserStats / getExerciseStatsForUser: pass through to the repository", async () => {
    vi.mocked(workoutRepo.getAllUserStats).mockResolvedValue([{ id: "s1" }] as any);
    vi.mocked(workoutRepo.getExerciseStats).mockResolvedValue({ id: "s1" } as any);

    expect(await workoutService.getAllUserStats("u1")).toEqual([{ id: "s1" }]);
    expect(await workoutService.getExerciseStatsForUser("u1", "e1")).toEqual({ id: "s1" });
    expect(workoutRepo.getExerciseStats).toHaveBeenCalledWith("u1", "e1");
  });

  describe("getNextFromPlan", () => {
    const planWorkout = (overrides: any = {}) => ({
      id: "w1",
      userId: "u1",
      workoutPlanId: "p1",
      skippedPlanExerciseIds: [],
      items: [],
      plan: {
        id: "p1",
        items: [
          { exerciseId: "e1", orderInPlan: 0, exercise: { id: "e1", name: "Squat" } },
          { exerciseId: "e2", orderInPlan: 1, exercise: { id: "e2", name: "Bench" } },
          { exerciseId: "e3", orderInPlan: 2, exercise: { id: "e3", name: "Row" } },
        ],
      },
      ...overrides,
    });

    it("returns first item in order when nothing was added or skipped", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(planWorkout() as any);

      const result = await workoutService.getNextFromPlan("w1", "u1");

      expect(result).toEqual({
        planAttached: true,
        finished: false,
        remaining: 3,
        next: { exerciseId: "e1", exerciseName: "Squat", orderInPlan: 0 },
      });
    });

    it("skips already added exercises", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({ items: [{ exerciseId: "e1" }] }) as any,
      );

      const result = await workoutService.getNextFromPlan("w1", "u1");

      expect(result.next).toEqual({
        exerciseId: "e2",
        exerciseName: "Bench",
        orderInPlan: 1,
      });
      expect(result.remaining).toBe(2);
      expect(result.finished).toBe(false);
    });

    it("skips exercises in skippedPlanExerciseIds", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({ skippedPlanExerciseIds: ["e1", "e2"] }) as any,
      );

      const result = await workoutService.getNextFromPlan("w1", "u1");

      expect(result.next).toEqual({
        exerciseId: "e3",
        exerciseName: "Row",
        orderInPlan: 2,
      });
      expect(result.remaining).toBe(1);
    });

    it("marks finished when plan is exhausted", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({
          items: [{ exerciseId: "e1" }, { exerciseId: "e2" }, { exerciseId: "e3" }],
        }) as any,
      );

      const result = await workoutService.getNextFromPlan("w1", "u1");

      expect(result).toEqual({
        planAttached: true,
        finished: true,
        remaining: 0,
        next: null,
      });
    });

    it("marks planAttached=false when workout has no plan", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue({
        id: "w1",
        userId: "u1",
        workoutPlanId: null,
        skippedPlanExerciseIds: [],
        items: [],
        plan: null,
      } as any);

      const result = await workoutService.getNextFromPlan("w1", "u1");

      expect(result).toEqual({
        planAttached: false,
        finished: false,
        remaining: 0,
        next: null,
      });
    });

    it("rejects when caller is not the owner", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({ userId: "other" }) as any,
      );

      await expect(workoutService.getNextFromPlan("w1", "u1")).rejects.toThrow(
        /uprawnień/,
      );
    });
  });

  describe("skipPlanExercise", () => {
    const planWorkout = (overrides: any = {}) => ({
      id: "w1",
      userId: "u1",
      workoutPlanId: "p1",
      skippedPlanExerciseIds: [],
      items: [],
      plan: {
        id: "p1",
        items: [
          { exerciseId: "e1", orderInPlan: 0, exercise: { id: "e1", name: "Squat" } },
        ],
      },
      ...overrides,
    });

    it("appends exerciseId to skipped list and persists", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout() as any,
      );
      vi.mocked(workoutRepo.setSkippedPlanExerciseIds).mockResolvedValue({
        id: "w1",
        skippedPlanExerciseIds: ["e1"],
      } as any);

      const result = await workoutService.skipPlanExercise("w1", "u1", "e1");

      expect(workoutRepo.setSkippedPlanExerciseIds).toHaveBeenCalledWith("w1", [
        "e1",
      ]);
      expect(result.skippedPlanExerciseIds).toEqual(["e1"]);
    });

    it("is idempotent when exercise already skipped", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({ skippedPlanExerciseIds: ["e1"] }) as any,
      );

      const result = await workoutService.skipPlanExercise("w1", "u1", "e1");

      expect(workoutRepo.setSkippedPlanExerciseIds).not.toHaveBeenCalled();
      expect(result.skippedPlanExerciseIds).toEqual(["e1"]);
    });

    it("rejects when exercise does not belong to plan", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout() as any,
      );

      await expect(
        workoutService.skipPlanExercise("w1", "u1", "e-outside"),
      ).rejects.toThrow(/Ćwiczenie nie należy/);
    });

    it("rejects when caller is not the owner", async () => {
      vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue(
        planWorkout({ userId: "other" }) as any,
      );

      await expect(
        workoutService.skipPlanExercise("w1", "u1", "e1"),
      ).rejects.toThrow(/uprawnień/);
    });
  });
});
