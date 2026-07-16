import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRes } from "../../test/mockResponse.js";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";

vi.mock("./workout.service.js", () => ({
  createWorkout: vi.fn(),
  getWorkoutById: vi.fn(),
  getUserWorkouts: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  addExerciseToWorkout: vi.fn(),
  updateWorkoutItem: vi.fn(),
  deleteWorkoutItem: vi.fn(),
  addSetToWorkoutItem: vi.fn(),
  updateWorkoutSet: vi.fn(),
  deleteWorkoutSet: vi.fn(),
  getExerciseStatsForUser: vi.fn(),
  getAllUserStats: vi.fn(),
  getStatsOverview: vi.fn(),
  getExerciseProgression: vi.fn(),
  getActiveWorkoutId: vi.fn(),
  clearActiveWorkout: vi.fn(),
  getNextFromPlan: vi.fn(),
  skipPlanExercise: vi.fn(),
}));

import * as workoutController from "./workout.controller.js";
import * as workoutService from "./workout.service.js";

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, query: {}, userId: "u1", ...overrides }) as any;

describe("workout.controller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createWorkout: 201, przekazuje req.userId", async () => {
    vi.mocked(workoutService.createWorkout).mockResolvedValue({ id: "w1" } as any);
    const res = createMockRes();

    await workoutController.createWorkout(makeReq({ body: { workoutName: "A" } }), res);

    expect(workoutService.createWorkout).toHaveBeenCalledWith("u1", { workoutName: "A" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: { id: "w1" } });
  });

  it("getWorkoutById: NotFoundError -> 404", async () => {
    vi.mocked(workoutService.getWorkoutById).mockRejectedValue(
      new NotFoundError("Trening nie znaleziony"),
    );
    const res = createMockRes();

    await workoutController.getWorkoutById(makeReq({ params: { id: "w1" } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: "Trening nie znaleziony" });
  });

  it("getWorkoutById: ForbiddenError -> 403 (cudzy trening)", async () => {
    vi.mocked(workoutService.getWorkoutById).mockRejectedValue(
      new ForbiddenError("Brak uprawnień do tego treningu"),
    );
    const res = createMockRes();

    await workoutController.getWorkoutById(makeReq({ params: { id: "w1" } }), res);

    expect(res.statusCode).toBe(403);
  });

  it("getUserWorkouts: zwraca count", async () => {
    vi.mocked(workoutService.getUserWorkouts).mockResolvedValue([{ id: "w1" }] as any);
    const res = createMockRes();

    await workoutController.getUserWorkouts(makeReq(), res);

    expect(res.body).toEqual({ success: true, data: [{ id: "w1" }], count: 1 });
  });

  it("deleteWorkout: komunikat sukcesu", async () => {
    vi.mocked(workoutService.deleteWorkout).mockResolvedValue({} as any);
    const res = createMockRes();

    await workoutController.deleteWorkout(makeReq({ params: { id: "w1" } }), res);

    expect(res.body).toEqual({ success: true, message: "Trening usunięty" });
  });

  it("getExerciseStats: brak statystyk -> data null + komunikat", async () => {
    vi.mocked(workoutService.getExerciseStatsForUser).mockResolvedValue(null as any);
    const res = createMockRes();

    await workoutController.getExerciseStats(
      makeReq({ params: { exerciseId: "e1" } }),
      res,
    );

    expect(res.body).toEqual({
      success: true,
      data: null,
      message: "To twoje pierwsze wykonanie tego ćwiczenia",
    });
  });

  it("getExerciseStats: ze statystykami -> zwraca dane", async () => {
    vi.mocked(workoutService.getExerciseStatsForUser).mockResolvedValue({ maxWeight: 100 } as any);
    const res = createMockRes();

    await workoutController.getExerciseStats(
      makeReq({ params: { exerciseId: "e1" } }),
      res,
    );

    expect(res.body).toEqual({ success: true, data: { maxWeight: 100 } });
  });

  it("addSetToWorkoutItem: 201", async () => {
    vi.mocked(workoutService.addSetToWorkoutItem).mockResolvedValue({ id: "s1" } as any);
    const res = createMockRes();

    await workoutController.addSetToWorkoutItem(
      makeReq({ params: { itemId: "i1" }, body: { weight: 50, repetitions: 5 } }),
      res,
    );

    expect(res.statusCode).toBe(201);
  });

  it("skipPlanExercise: przekazuje exerciseId z body", async () => {
    vi.mocked(workoutService.skipPlanExercise).mockResolvedValue({ workoutId: "w1" } as any);
    const res = createMockRes();

    await workoutController.skipPlanExercise(
      makeReq({ params: { id: "w1" }, body: { exerciseId: "e1" } }),
      res,
    );

    expect(workoutService.skipPlanExercise).toHaveBeenCalledWith("w1", "u1", "e1");
    expect(res.body).toEqual({ success: true, data: { workoutId: "w1" } });
  });
});
