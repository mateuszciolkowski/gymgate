import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  setCreate: vi.fn(),
  workoutUpdate: vi.fn(),
  itemCreate: vi.fn(),
  pendingFind: vi.fn(),
  exCreate: vi.fn(),
  exUpdate: vi.fn(),
  planCreate: vi.fn(),
  planUpdate: vi.fn(),
  planFindOrThrow: vi.fn(),
  versionCreate: vi.fn(),
  versionFindFirst: vi.fn(),
  versionCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../config/database.js", () => ({
  default: {
    $transaction: m.transaction,
    workoutSet: { create: m.setCreate },
    workout: { update: m.workoutUpdate },
    exercise: { create: m.exCreate, update: m.exUpdate },
  },
}));

import * as workoutRepo from "./workout.repository.js";
import { ExerciseRepository } from "../exercise/exercise.repository.js";
import { PlanRepository } from "../plan/plan.repository.js";

const at = new Date("2026-11-01T10:00:00.000Z");
const created = new Date("2026-11-01T09:00:00.000Z");

const tx = () => ({
  workoutItem: { findUnique: vi.fn(), create: m.itemCreate },
  exercisePendingNote: { findUnique: m.pendingFind, delete: vi.fn() },
  workoutPlan: { create: m.planCreate, update: m.planUpdate, findUniqueOrThrow: m.planFindOrThrow },
  workoutPlanItem: { deleteMany: vi.fn(), createMany: vi.fn() },
  workoutPlanVersion: { create: m.versionCreate, findFirst: m.versionFindFirst, createMany: m.versionCreateMany },
});

describe("repository write stamps (id / createdAt / updatedAt)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(tx()));
    m.pendingFind.mockResolvedValue(null);
  });

  describe("workout set", () => {
    it("without stamp: data is exactly the pre-sync shape", async () => {
      await workoutRepo.addSetToWorkoutItem("i1", 50, 5, 2);
      expect(m.setCreate).toHaveBeenCalledWith({
        data: { itemId: "i1", weight: 50, repetitions: 5, setNumber: 2, clientId: null },
      });
    });

    it("with stamp: adds id and timestamps", async () => {
      await workoutRepo.addSetToWorkoutItem("i1", 50, 5, 2, undefined, { id: "s1", createdAt: created, updatedAt: at });
      expect(m.setCreate).toHaveBeenCalledWith({
        data: { itemId: "i1", weight: 50, repetitions: 5, setNumber: 2, clientId: null, id: "s1", createdAt: created, updatedAt: at },
      });
    });
  });

  describe("workout item", () => {
    it("without stamp: data has no id / createdAt / updatedAt keys", async () => {
      m.itemCreate.mockResolvedValue({ id: "x" });
      await workoutRepo.addExerciseToWorkoutWithPendingNote("w1", "u1", "e1", 1);
      const data = m.itemCreate.mock.calls[0]![0].data;
      expect(data).toEqual({ workoutId: "w1", exerciseId: "e1", orderInWorkout: 1, notes: null, previousNote: null, clientId: null });
      expect(Object.keys(data)).not.toContain("id");
      expect(Object.keys(data)).not.toContain("updatedAt");
    });

    it("with stamp: adds id and timestamps", async () => {
      m.itemCreate.mockResolvedValue({ id: "x" });
      await workoutRepo.addExerciseToWorkoutWithPendingNote("w1", "u1", "e1", 1, undefined, undefined, { id: "i9", createdAt: created, updatedAt: at });
      expect(m.itemCreate.mock.calls[0]![0].data).toMatchObject({ id: "i9", createdAt: created, updatedAt: at });
    });
  });

  describe("skipped plan exercises", () => {
    it("without updatedAt: data unchanged", async () => {
      await workoutRepo.setSkippedPlanExerciseIds("w1", ["e1"]);
      expect(m.workoutUpdate.mock.calls[0]![0].data).toEqual({ skippedPlanExerciseIds: ["e1"] });
    });

    it("with updatedAt: sets it", async () => {
      await workoutRepo.setSkippedPlanExerciseIds("w1", ["e1"], at);
      expect(m.workoutUpdate.mock.calls[0]![0].data).toEqual({ skippedPlanExerciseIds: ["e1"], updatedAt: at });
    });
  });

  describe("exercise", () => {
    it("create without stamp: no id / timestamps", async () => {
      await new ExerciseRepository().create({ name: "A", muscleGroups: ["CHEST"], userId: "u1" });
      expect(m.exCreate.mock.calls[0]![0].data).toEqual({ name: "A", muscleGroups: ["CHEST"], description: null, creatorUserId: "u1" });
    });

    it("create with stamp", async () => {
      await new ExerciseRepository().create({ name: "A", muscleGroups: ["CHEST"], userId: "u1" }, { id: "e1", createdAt: created, updatedAt: at });
      expect(m.exCreate.mock.calls[0]![0].data).toMatchObject({ id: "e1", createdAt: created, updatedAt: at });
    });

    it("update without stamp: only changed fields", async () => {
      await new ExerciseRepository().update("e1", { name: "B" });
      expect(m.exUpdate.mock.calls[0]![0].data).toEqual({ name: "B" });
    });

    it("update with stamp sets updatedAt", async () => {
      await new ExerciseRepository().update("e1", { name: "B" }, { updatedAt: at });
      expect(m.exUpdate.mock.calls[0]![0].data).toEqual({ name: "B", updatedAt: at });
    });
  });

  describe("plan", () => {
    const plan = { id: "p1", name: "Push", shortName: null, isPublic: false, creatorUserId: "u1", updatedAt: at, items: [] };

    it("create without stamp: plan data has no id / timestamps", async () => {
      m.planCreate.mockResolvedValue(plan);
      await new PlanRepository().create({ name: "Push", creatorUserId: "u1", isPublic: false, exerciseIds: ["e1"] });
      const data = m.planCreate.mock.calls[0]![0].data;
      expect(Object.keys(data).sort()).toEqual(["creatorUserId", "isPublic", "items", "name", "shortName"]);
    });

    it("create with stamp", async () => {
      m.planCreate.mockResolvedValue(plan);
      await new PlanRepository().create({ name: "Push", creatorUserId: "u1", isPublic: false, exerciseIds: ["e1"] }, { id: "p9", createdAt: created, updatedAt: at });
      expect(m.planCreate.mock.calls[0]![0].data).toMatchObject({ id: "p9", createdAt: created, updatedAt: at });
    });

    it("update without stamp: no updatedAt; with stamp: updatedAt set", async () => {
      m.planFindOrThrow.mockResolvedValue(plan);
      m.planUpdate.mockResolvedValue({ ...plan, favoritedBy: [] });
      m.versionFindFirst.mockResolvedValue(null);
      await new PlanRepository().update("p1", { name: "Pull" }, "u1");
      expect(m.planUpdate.mock.calls[0]![0].data).toEqual({ name: "Pull" });
      await new PlanRepository().update("p1", { name: "Pull" }, "u1", { updatedAt: at });
      expect(m.planUpdate.mock.calls[1]![0].data).toEqual({ name: "Pull", updatedAt: at });
    });
  });
});
