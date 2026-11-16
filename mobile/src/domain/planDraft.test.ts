import {
  EMPTY_PLAN_DRAFT,
  MAX_PLAN_EXERCISES,
  appendExercise,
  draftFromPlan,
  planDraftError,
  type PlanDraft,
} from "./planDraft";
import type { WorkoutPlan } from "./types";

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
      {
        id: "i2",
        planId: "p1",
        exerciseId: "squat",
        orderInPlan: 1,
        exercise: { id: "squat", name: "Przysiad", muscleGroups: ["LEGS"] },
      },
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
    expect(next.items).toEqual([
      { exerciseId: "bench", name: "Wyciskanie", muscleGroups: ["CHEST"] },
    ]);
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

describe("planDraftError", () => {
  const item = (id: string) => ({ exerciseId: id, name: id, muscleGroups: [] });
  const base = { name: "Plan A", isPublic: false, isGlobal: false, items: [item("a")] };
  const creator = (id: string) => (id === "own" ? "u1" : id === "builtin" ? null : id === "legacy" ? "1" : undefined);

  it("checks in the PWA order", () => {
    expect(planDraftError({ ...base, name: " ab ", items: [] }, creator)).toBe("Nazwa planu musi mieć co najmniej 3 znaki");
    expect(planDraftError({ ...base, name: "x".repeat(101), items: [] }, creator)).toBe("Nazwa planu może mieć maksymalnie 100 znaków");
    expect(planDraftError({ ...base, items: [] }, creator)).toBe("Dodaj co najmniej 1 ćwiczenie");
    expect(planDraftError({ ...base, items: Array.from({ length: 51 }, (_, i) => item(`e${i}`)) }, creator)).toBe("Plan może zawierać maksymalnie 50 ćwiczeń");
    expect(planDraftError({ ...base, isPublic: true, items: [item("own")] }, creator)).toBe("Plan publiczny lub globalny nie może zawierać prywatnych ćwiczeń");
  });
  it("allows private exercises in a private plan and global ones in a public plan", () => {
    expect(planDraftError({ ...base, items: [item("own")] }, creator)).toBeNull();
    expect(planDraftError({ ...base, isPublic: true, items: [item("builtin"), item("legacy"), item("unknown")] }, creator)).toBeNull();
    expect(planDraftError({ ...base, isGlobal: true, items: [item("own")] }, creator)).not.toBeNull();
  });
});
