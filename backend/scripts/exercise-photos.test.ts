import { describe, expect, it } from "vitest";
import { planStages } from "./exercise-photos.js";

describe("planStages", () => {
  const start = [{ id: "a", photoStage: "START" }];

  it("allows an END photo next to the existing START", () => {
    expect(planStages(start, [{ exerciseId: "x", photoUrl: "u", photoStage: "END" }])).toEqual([]);
  });

  it("refuses a second START (insert without stage defaults to START)", () => {
    const errors = planStages(start, [{ exerciseId: "x", photoUrl: "u" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("START twice");
  });

  it("allows relabelling the existing photo to END and inserting a new START", () => {
    expect(planStages(start, [{ exerciseId: "x", photoId: "a", setStage: "END" }, { exerciseId: "x", photoUrl: "u", photoStage: "START" }])).toEqual([]);
  });

  it("refuses relabelling a photo that is not this exercise's", () => {
    const errors = planStages(start, [{ exerciseId: "x", photoId: "zzz", setStage: "END" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a photo of");
  });
});
