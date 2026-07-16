import { describe, expect, it } from "vitest";
import {
  createPlanSchema,
  updatePlanSchema,
  listPlansSchema,
  getPlanSchema,
} from "./plan.schema.js";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-9222-222222222222";

describe("plan.schema", () => {
  describe("createPlanSchema", () => {
    it("akceptuje poprawny plan i domyśla isPublic=false", () => {
      const res = createPlanSchema.safeParse({
        body: { name: "Push Day", exerciseIds: [UUID_A] },
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.body.isPublic).toBe(false);
    });

    it("odrzuca zbyt krótką nazwę (<3)", () => {
      const res = createPlanSchema.safeParse({
        body: { name: "ab", exerciseIds: [UUID_A] },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca pustą listę ćwiczeń", () => {
      const res = createPlanSchema.safeParse({
        body: { name: "Plan", exerciseIds: [] },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca zduplikowane exerciseIds", () => {
      const res = createPlanSchema.safeParse({
        body: { name: "Plan", exerciseIds: [UUID_A, UUID_A] },
      });
      expect(res.success).toBe(false);
    });

    it("akceptuje różne uuid i isPublic=true", () => {
      const res = createPlanSchema.safeParse({
        body: { name: "Plan", exerciseIds: [UUID_A, UUID_B], isPublic: true },
      });
      expect(res.success).toBe(true);
    });
  });

  describe("updatePlanSchema", () => {
    it("wymaga uuid w params.id", () => {
      const res = updatePlanSchema.safeParse({
        params: { id: "bad" },
        body: { name: "Renamed" },
      });
      expect(res.success).toBe(false);
    });

    it("akceptuje częściową aktualizację", () => {
      const res = updatePlanSchema.safeParse({
        params: { id: UUID_A },
        body: { isPublic: true },
      });
      expect(res.success).toBe(true);
    });
  });

  describe("listPlansSchema", () => {
    it("domyślny tab = 'mine'", () => {
      const res = listPlansSchema.safeParse({ query: {} });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.query.tab).toBe("mine");
    });

    it("odrzuca nieznany tab", () => {
      expect(listPlansSchema.safeParse({ query: { tab: "weird" } }).success).toBe(false);
    });
  });

  describe("getPlanSchema", () => {
    it("wymaga uuid", () => {
      expect(getPlanSchema.safeParse({ params: { id: UUID_A } }).success).toBe(true);
      expect(getPlanSchema.safeParse({ params: { id: "x" } }).success).toBe(false);
    });
  });
});
