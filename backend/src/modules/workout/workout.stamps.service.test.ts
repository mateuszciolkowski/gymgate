import { beforeEach, describe, expect, it, vi } from "vitest";
import * as workoutService from "./workout.service.js";
import * as workoutRepo from "./workout.repository.js";

vi.mock("./workout.repository.js");

const at = new Date("2026-11-01T10:00:00.000Z");
const item = { id: "i1", workoutId: "w1", exerciseId: "e1", notes: null, sets: [] };
const workout = { id: "w1", userId: "u1", status: "DRAFT", items: [item] };

describe("workout.service: write stamps are opt-in", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(workoutRepo.findWorkoutById).mockResolvedValue(workout as any);
    vi.mocked(workoutRepo.findWorkoutItemById).mockResolvedValue(item as any);
    vi.mocked(workoutRepo.getMaxSetNumber).mockResolvedValue(3);
    vi.mocked(workoutRepo.getMaxOrderInWorkout).mockResolvedValue(1);
    vi.mocked(workoutRepo.addSetToWorkoutItem).mockResolvedValue({ id: "s1" } as any);
    vi.mocked(workoutRepo.addExerciseToWorkoutWithPendingNote).mockResolvedValue({ id: "i1" } as any);
    vi.mocked(workoutRepo.updateWorkout).mockResolvedValue({ id: "w1" } as any);
    vi.mocked(workoutRepo.updateWorkoutItem).mockResolvedValue({ id: "i1" } as any);
    vi.mocked(workoutRepo.updateWorkoutSet).mockResolvedValue({ id: "s1", itemId: "i1" } as any);
    vi.mocked(workoutRepo.findWorkoutWithPlan).mockResolvedValue({
      id: "w1", userId: "u1", skippedPlanExerciseIds: [], plan: { items: [{ exerciseId: "e1" }] },
    } as any);
    vi.mocked(workoutRepo.setSkippedPlanExerciseIds).mockResolvedValue({ id: "w1", skippedPlanExerciseIds: ["e1"] } as any);
  });

  it("addSetToWorkoutItem: PWA call passes the original 5 args and max+1", async () => {
    await workoutService.addSetToWorkoutItem("i1", "u1", { weight: 50, repetitions: 5 });
    expect(workoutRepo.addSetToWorkoutItem).toHaveBeenCalledWith("i1", 50, 5, 4, undefined);
  });

  it("addSetToWorkoutItem: stamp supplies id, timestamps and device set number", async () => {
    await workoutService.addSetToWorkoutItem("i1", "u1", { weight: 50, repetitions: 5 }, { id: "s9", updatedAt: at, setNumber: 7 });
    expect(workoutRepo.addSetToWorkoutItem).toHaveBeenCalledWith("i1", 50, 5, 7, undefined, { id: "s9", updatedAt: at });
    expect(workoutRepo.getMaxSetNumber).not.toHaveBeenCalled();
  });

  it("addExerciseToWorkout: PWA call has 6 args, stamp adds a 7th", async () => {
    await workoutService.addExerciseToWorkout("w1", "u1", { exerciseId: "e1" });
    expect(workoutRepo.addExerciseToWorkoutWithPendingNote).toHaveBeenLastCalledWith("w1", "u1", "e1", 2, undefined, undefined);
    await workoutService.addExerciseToWorkout("w1", "u1", { exerciseId: "e1", orderInWorkout: 4 }, { id: "i9", updatedAt: at });
    expect(workoutRepo.addExerciseToWorkoutWithPendingNote).toHaveBeenLastCalledWith("w1", "u1", "e1", 4, undefined, undefined, { id: "i9", updatedAt: at });
  });

  it("updateWorkout / updateWorkoutItem / updateWorkoutSet: updatedAt only with stamp", async () => {
    await workoutService.updateWorkout("w1", "u1", { workoutName: "X" });
    expect(workoutRepo.updateWorkout).toHaveBeenLastCalledWith("w1", { workoutName: "X" });
    await workoutService.updateWorkout("w1", "u1", { workoutName: "X" }, { updatedAt: at });
    expect(workoutRepo.updateWorkout).toHaveBeenLastCalledWith("w1", { workoutName: "X", updatedAt: at });

    await workoutService.updateWorkoutItem("i1", "u1", { orderInWorkout: 2 });
    expect(workoutRepo.updateWorkoutItem).toHaveBeenLastCalledWith("i1", { orderInWorkout: 2 });
    await workoutService.updateWorkoutItem("i1", "u1", { orderInWorkout: 2 }, { updatedAt: at });
    expect(workoutRepo.updateWorkoutItem).toHaveBeenLastCalledWith("i1", { orderInWorkout: 2, updatedAt: at });

    await workoutService.updateWorkoutSet("s1", "u1", { weight: 60 });
    expect(workoutRepo.updateWorkoutSet).toHaveBeenLastCalledWith("s1", { weight: 60 });
    await workoutService.updateWorkoutSet("s1", "u1", { weight: 60 }, { updatedAt: at });
    expect(workoutRepo.updateWorkoutSet).toHaveBeenLastCalledWith("s1", { weight: 60, updatedAt: at });
  });

  it("skipPlanExercise: PWA call has 2 args, stamp adds updatedAt", async () => {
    await workoutService.skipPlanExercise("w1", "u1", "e1");
    expect(workoutRepo.setSkippedPlanExerciseIds).toHaveBeenLastCalledWith("w1", ["e1"]);
    await workoutService.skipPlanExercise("w1", "u1", "e1", { updatedAt: at });
    expect(workoutRepo.setSkippedPlanExerciseIds).toHaveBeenLastCalledWith("w1", ["e1"], at);
  });

  it("exports the derived-data functions used by sync", () => {
    expect(typeof workoutService.rebuildExerciseStatsFromCompletedWorkouts).toBe("function");
    expect(typeof workoutService.syncPendingNoteForExercise).toBe("function");
  });
});
