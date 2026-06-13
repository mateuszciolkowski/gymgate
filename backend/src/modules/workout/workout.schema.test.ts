import { describe, expect, it } from "vitest";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  addExerciseToWorkoutSchema,
  createWorkoutSetSchema,
  updateWorkoutSetSchema,
  getWorkoutsQuerySchema,
  skipPlanExerciseSchema,
} from "./workout.schema.js";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("workout.schema", () => {
  describe("createWorkoutSchema", () => {
    it("akceptuje pusty body (wszystko opcjonalne)", () => {
      expect(createWorkoutSchema.safeParse({ body: {} }).success).toBe(true);
    });

    it("odrzuca workoutDate niebędący datetime", () => {
      const res = createWorkoutSchema.safeParse({
        body: { workoutDate: "2026-01-01" },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca workoutPlanId niebędący uuid", () => {
      const res = createWorkoutSchema.safeParse({
        body: { workoutPlanId: "nope" },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("updateWorkoutSchema", () => {
    it("akceptuje dozwolony status", () => {
      expect(
        updateWorkoutSchema.safeParse({ body: { status: "COMPLETED" } }).success,
      ).toBe(true);
    });

    it("odrzuca nieznany status", () => {
      expect(
        updateWorkoutSchema.safeParse({ body: { status: "PAUSED" } }).success,
      ).toBe(false);
    });

    it("odrzuca ujemne durationSeconds", () => {
      expect(
        updateWorkoutSchema.safeParse({ body: { durationSeconds: -5 } }).success,
      ).toBe(false);
    });
  });

  describe("addExerciseToWorkoutSchema", () => {
    it("akceptuje poprawne body+params", () => {
      const res = addExerciseToWorkoutSchema.safeParse({
        body: { exerciseId: UUID },
        params: { workoutId: UUID },
      });
      expect(res.success).toBe(true);
    });

    it("odrzuca exerciseId niebędący uuid", () => {
      const res = addExerciseToWorkoutSchema.safeParse({
        body: { exerciseId: "x" },
        params: { workoutId: UUID },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca orderInWorkout <= 0", () => {
      const res = addExerciseToWorkoutSchema.safeParse({
        body: { exerciseId: UUID, orderInWorkout: 0 },
        params: { workoutId: UUID },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("createWorkoutSetSchema", () => {
    it("akceptuje dodatnią wagę i powtórzenia", () => {
      const res = createWorkoutSetSchema.safeParse({
        body: { weight: 60, repetitions: 8 },
        params: { itemId: UUID },
      });
      expect(res.success).toBe(true);
    });

    it("odrzuca niedodatnią wagę", () => {
      const res = createWorkoutSetSchema.safeParse({
        body: { weight: 0, repetitions: 8 },
        params: { itemId: UUID },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca nie-całkowite powtórzenia", () => {
      const res = createWorkoutSetSchema.safeParse({
        body: { weight: 60, repetitions: 8.5 },
        params: { itemId: UUID },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("updateWorkoutSetSchema", () => {
    it("akceptuje weight = 0 (nonnegative)", () => {
      const res = updateWorkoutSetSchema.safeParse({
        body: { weight: 0 },
        params: { setId: UUID },
      });
      expect(res.success).toBe(true);
    });
  });

  describe("getWorkoutsQuerySchema", () => {
    it("transformuje limit/offset ze stringów na liczby", () => {
      const res = getWorkoutsQuerySchema.safeParse({
        query: { limit: "10", offset: "5" },
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.query.limit).toBe(10);
        expect(res.data.query.offset).toBe(5);
      }
    });

    it("odrzuca limit <= 0 po transformacji", () => {
      const res = getWorkoutsQuerySchema.safeParse({ query: { limit: "0" } });
      expect(res.success).toBe(false);
    });
  });

  describe("skipPlanExerciseSchema", () => {
    it("wymaga uuid w params.id i body.exerciseId", () => {
      expect(
        skipPlanExerciseSchema.safeParse({
          params: { id: UUID },
          body: { exerciseId: UUID },
        }).success,
      ).toBe(true);
      expect(
        skipPlanExerciseSchema.safeParse({
          params: { id: UUID },
          body: { exerciseId: "x" },
        }).success,
      ).toBe(false);
    });
  });
});
