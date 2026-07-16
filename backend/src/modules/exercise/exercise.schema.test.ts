import { describe, expect, it } from "vitest";
import {
  createExerciseSchema,
  updateExerciseSchema,
  getExerciseSchema,
  filterExercisesSchema,
} from "./exercise.schema.js";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("exercise.schema", () => {
  describe("createExerciseSchema", () => {
    it("akceptuje poprawne ćwiczenie", () => {
      const res = createExerciseSchema.safeParse({
        body: { name: "Bench Press", muscleGroups: ["CHEST"] },
      });
      expect(res.success).toBe(true);
    });

    it("odrzuca pustą nazwę", () => {
      const res = createExerciseSchema.safeParse({
        body: { name: "", muscleGroups: ["CHEST"] },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca pustą listę grup mięśniowych", () => {
      const res = createExerciseSchema.safeParse({
        body: { name: "X", muscleGroups: [] },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca nieznaną grupę mięśniową", () => {
      const res = createExerciseSchema.safeParse({
        body: { name: "X", muscleGroups: ["NOSE"] },
      });
      expect(res.success).toBe(false);
    });

    it("akceptuje flagę isGlobal", () => {
      const res = createExerciseSchema.safeParse({
        body: { name: "X", muscleGroups: ["BACK"], isGlobal: true },
      });
      expect(res.success).toBe(true);
    });
  });

  describe("updateExerciseSchema", () => {
    it("odrzuca params z nie-uuid id", () => {
      const res = updateExerciseSchema.safeParse({
        params: { id: "abc" },
        body: { name: "New" },
      });
      expect(res.success).toBe(false);
    });

    it("akceptuje poprawne id + częściową aktualizację", () => {
      const res = updateExerciseSchema.safeParse({
        params: { id: UUID },
        body: { name: "New" },
      });
      expect(res.success).toBe(true);
    });
  });

  describe("getExerciseSchema", () => {
    it("wymaga uuid", () => {
      expect(getExerciseSchema.safeParse({ params: { id: "x" } }).success).toBe(false);
      expect(getExerciseSchema.safeParse({ params: { id: UUID } }).success).toBe(true);
    });
  });

  describe("filterExercisesSchema", () => {
    it("akceptuje pusty query", () => {
      expect(filterExercisesSchema.safeParse({ query: {} }).success).toBe(true);
    });

    it("odrzuca błędną grupę mięśniową w filtrze", () => {
      const res = filterExercisesSchema.safeParse({
        query: { muscleGroup: "WRONG" },
      });
      expect(res.success).toBe(false);
    });
  });
});
