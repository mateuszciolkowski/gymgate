import { describe, expect, it } from "vitest";
import {
  EMPTY_PLAN_DRAFT,
  MAX_PLAN_EXERCISES,
  appendExercise,
  draftFromPlan,
  type PlanDraft,
} from "./planDraft";
import type { WorkoutPlan } from "@/types";

const bench = { id: "bench", name: "Wyciskanie", muscleGroups: ["CHEST"] };

function makePlan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: "p1",
    name: "FBW",
    shortName: null,
    creatorUserId: "u1",
    isPublic: true,
    isFavorite: false,
    createdAt: "",
    updatedAt: "",
    items: [
      { id: "i2", planId: "p1", exerciseId: "squat", orderInPlan: 1, exercise: { id: "squat", name: "Przysiad", muscleGroups: ["LEGS"] } },
      { id: "i1", planId: "p1", exerciseId: "bench", orderInPlan: 0, exercise: bench },
    ],
    ...overrides,
  } as WorkoutPlan;
}

describe("draftFromPlan", () => {
  it("returns an empty draft for no plan", () => {
    expect(draftFromPlan(null)).toEqual(EMPTY_PLAN_DRAFT);
  });

  it("maps fields and sorts items by orderInPlan", () => {
    const draft = draftFromPlan(makePlan());
    expect(draft.name).toBe("FBW");
    expect(draft.shortName).toBe("");
    expect(draft.isPublic).toBe(true);
    expect(draft.isGlobal).toBe(false);
    expect(draft.items.map((i) => i.exerciseId)).toEqual(["bench", "squat"]);
  });

  it("marks built-in plans (creatorUserId null) as global", () => {
    expect(draftFromPlan(makePlan({ creatorUserId: null })).isGlobal).toBe(true);
  });
});

describe("appendExercise", () => {
  const base: PlanDraft = { ...EMPTY_PLAN_DRAFT, name: "Moj plan" };

  it("appends the exercise and keeps other draft fields (unsaved edits survive)", () => {
    const next = appendExercise(base, bench);
    expect(next.name).toBe("Moj plan");
    expect(next.items).toEqual([{ exerciseId: "bench", name: "Wyciskanie", muscleGroups: ["CHEST"] }]);
  });

  it("does not mutate the input draft", () => {
    appendExercise(base, bench);
    expect(base.items).toEqual([]);
  });

  it("ignores duplicates", () => {
    const once = appendExercise(base, bench);
    expect(appendExercise(once, bench)).toBe(once);
  });

  it("ignores additions over the 50-exercise cap", () => {
    const full: PlanDraft = {
      ...base,
      items: Array.from({ length: MAX_PLAN_EXERCISES }, (_, i) => ({
        exerciseId: `e${i}`,
        name: `E${i}`,
        muscleGroups: [],
      })),
    };
    expect(appendExercise(full, bench)).toBe(full);
  });
});
