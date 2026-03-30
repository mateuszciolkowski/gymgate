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
  clearActiveWorkout: vi.fn(),
  getExerciseStats: vi.fn(),
  upsertExerciseStats: vi.fn(),
  getMaxOrderInWorkout: vi.fn(),
  addExerciseToWorkout: vi.fn(),
  addSetToWorkoutItem: vi.fn(),
  findWorkoutItemById: vi.fn(),
  getMaxSetNumber: vi.fn(),
  findWorkoutSetById: vi.fn(),
  deleteWorkoutSet: vi.fn(),
}));

describe("workout.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("updateWorkout: on COMPLETED updates stats and clears active workout", async () => {
    const workoutDate = new Date("2026-01-10T10:00:00.000Z");

    vi.mocked(workoutRepo.findWorkoutById)
      .mockResolvedValueOnce({
        id: "w1",
        userId: "u1",
      } as any)
      .mockResolvedValueOnce({
        id: "w1",
        userId: "u1",
        workoutDate,
        items: [
          {
            exerciseId: "e1",
            sets: [
              { weight: 80, repetitions: 5 },
              { weight: 85, repetitions: 3 },
            ],
          },
        ],
      } as any);

    vi.mocked(workoutRepo.updateWorkout).mockResolvedValue({
      id: "w1",
      status: "COMPLETED",
    } as any);
    vi.mocked(workoutRepo.getExerciseStats).mockResolvedValue({
      maxWeight: 82,
      maxWeightReps: 4,
      maxWeightDate: new Date("2025-12-01T10:00:00.000Z"),
      totalWorkouts: 2,
    } as any);

    const result = await workoutService.updateWorkout("w1", "u1", {
      status: "COMPLETED",
    });

    expect(result).toEqual({ id: "w1", status: "COMPLETED" });
    expect(workoutRepo.upsertExerciseStats).toHaveBeenCalledWith(
      "u1",
      "e1",
      expect.objectContaining({
        maxWeight: 85,
        maxWeightReps: 3,
        totalWorkouts: 3,
      }),
    );
    expect(workoutRepo.clearActiveWorkout).toHaveBeenCalledWith("u1");
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
});
