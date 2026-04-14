import { beforeEach, describe, expect, it, vi } from "vitest";
import * as workoutService from "./workout.service.js";
import * as workoutRepo from "./workout.repository.js";

vi.mock("./workout.repository.js", () => ({
  getActiveWorkout: vi.fn(),
  findWorkoutById: vi.fn(),
  createWorkout: vi.fn(),
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
  addSetToWorkoutItem: vi.fn(),
  findWorkoutItemById: vi.fn(),
  deleteWorkoutItem: vi.fn(),
  updateWorkoutItem: vi.fn(),
  getMaxSetNumber: vi.fn(),
  findWorkoutSetById: vi.fn(),
  updateWorkoutSet: vi.fn(),
  deleteWorkoutSet: vi.fn(),
  getAllUserStats: vi.fn(),
}));

describe("workout.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workoutRepo.getLastWorkoutNote).mockResolvedValue(null);
  });

  it("createWorkout: returns active workout when one already exists", async () => {
    vi.mocked(workoutRepo.getActiveWorkout).mockResolvedValue({
      activeWorkoutId: "w1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
    } as any);

    const result = await workoutService.createWorkout("u1", {});

    expect(result).toEqual({ id: "w1", userId: "u1" });
    expect(workoutRepo.createWorkout).not.toHaveBeenCalled();
    expect(workoutRepo.setActiveWorkout).not.toHaveBeenCalled();
  });

  it("createWorkout: creates new workout and sets activeWorkoutId when none exists", async () => {
    vi.mocked(workoutRepo.getActiveWorkout).mockResolvedValue({
      activeWorkoutId: null,
    } as any);
    vi.mocked(workoutRepo.createWorkout).mockResolvedValue({
      id: "w-new",
      userId: "u1",
    } as any);

    const result = await workoutService.createWorkout("u1", {
      workoutName: "Push Day",
      gymName: "Gym A",
    });

    expect(workoutRepo.createWorkout).toHaveBeenCalled();
    expect(workoutRepo.setActiveWorkout).toHaveBeenCalledWith("u1", "w-new");
    expect(result).toEqual({ id: "w-new", userId: "u1" });
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

  it("addExerciseToWorkout: auto-assigns order and creates default set", async () => {
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue({
      id: "w1",
      userId: "u1",
    } as any);
    vi.mocked(workoutRepo.getMaxOrderInWorkout).mockResolvedValue(2);
    vi.mocked(workoutRepo.addExerciseToWorkout).mockResolvedValue({
      id: "item-1",
    } as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue({
      id: "item-1",
      workoutId: "w1",
    } as any);

    const result = await workoutService.addExerciseToWorkout("w1", "u1", {
      exerciseId: "e1",
    });

    expect(workoutRepo.addExerciseToWorkout).toHaveBeenCalledWith(
      "w1",
      "e1",
      3,
      undefined,
    );
    expect(workoutRepo.addSetToWorkoutItem).toHaveBeenCalledWith("item-1", 0, 1, 1);
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
});
