import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRes } from "../../test/mockResponse.js";
import { ForbiddenError, NotFoundError } from "../../common/errors.js";

const serviceMethods = {
  getAllExercises: vi.fn(),
  getExerciseById: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
};

vi.mock("./exercise.service.js", () => ({
  ExerciseService: vi.fn(function () {
    return serviceMethods;
  }),
}));

import { ExerciseController } from "./exercise.controller.js";

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, query: {}, ...overrides }) as any;

describe("ExerciseController", () => {
  let controller: ExerciseController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ExerciseController();
  });

  describe("getAll", () => {
    it("zwraca listę z count i przekazuje filtry + userId", async () => {
      serviceMethods.getAllExercises.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
      const res = createMockRes();

      await controller.getAll(
        makeReq({ query: { muscleGroup: "CHEST", name: "press" }, userId: "u1" }),
        res,
      );

      expect(serviceMethods.getAllExercises).toHaveBeenCalledWith({
        muscleGroup: "CHEST",
        name: "press",
        userId: "u1",
      });
      expect(res.body).toEqual({
        success: true,
        data: [{ id: "e1" }, { id: "e2" }],
        count: 2,
      });
    });
  });

  describe("getById", () => {
    it("zwraca ćwiczenie", async () => {
      serviceMethods.getExerciseById.mockResolvedValue({ id: "e1" });
      const res = createMockRes();

      await controller.getById(makeReq({ params: { id: "e1" } }), res);

      expect(res.body).toEqual({ success: true, data: { id: "e1" } });
    });

    it("NotFoundError -> 404", async () => {
      serviceMethods.getExerciseById.mockRejectedValue(
        new NotFoundError("Exercise not found"),
      );
      const res = createMockRes();

      await controller.getById(makeReq({ params: { id: "x" } }), res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("create", () => {
    it("zwykły user tworzy prywatne ćwiczenie -> 201", async () => {
      serviceMethods.createExercise.mockResolvedValue({ id: "e1" });
      const res = createMockRes();

      await controller.create(
        makeReq({ body: { name: "Squat" }, userId: "u1", userIsAdmin: false }),
        res,
      );

      expect(serviceMethods.createExercise).toHaveBeenCalledWith({
        name: "Squat",
        userId: "u1",
      });
      expect(res.statusCode).toBe(201);
    });

    it("zwykły user próbuje stworzyć globalne -> 403, serwis nie wołany", async () => {
      const res = createMockRes();

      await controller.create(
        makeReq({ body: { name: "Squat", isGlobal: true }, userId: "u1", userIsAdmin: false }),
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(serviceMethods.createExercise).not.toHaveBeenCalled();
    });

    it("admin tworzy globalne -> 201", async () => {
      serviceMethods.createExercise.mockResolvedValue({ id: "e1" });
      const res = createMockRes();

      await controller.create(
        makeReq({ body: { name: "Squat", isGlobal: true }, userId: "admin", userIsAdmin: true }),
        res,
      );

      expect(res.statusCode).toBe(201);
    });
  });

  describe("update", () => {
    it("ForbiddenError z serwisu -> 403", async () => {
      serviceMethods.updateExercise.mockRejectedValue(
        new ForbiddenError("Unauthorized: You can only edit your own exercises"),
      );
      const res = createMockRes();

      await controller.update(
        makeReq({ params: { id: "e1" }, body: {}, userId: "u1" }),
        res,
      );

      expect(res.statusCode).toBe(403);
    });
  });

  describe("delete", () => {
    it("usuwa i zwraca 204 bez body", async () => {
      serviceMethods.deleteExercise.mockResolvedValue(undefined);
      const res = createMockRes();

      await controller.delete(
        makeReq({ params: { id: "e1" }, userId: "u1" }),
        res,
      );

      expect(serviceMethods.deleteExercise).toHaveBeenCalledWith("e1", "u1", undefined);
      expect(res.statusCode).toBe(204);
    });
  });
});
