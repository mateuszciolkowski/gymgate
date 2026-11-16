import type { Exercise, WorkoutPlan } from "./types";

export const MAX_PLAN_EXERCISES = 50;

export interface PlanExerciseItem {
  exerciseId: string;
  name: string;
  muscleGroups: string[];
}

/** Unsaved state of the plan form — kept above the form so it survives leaving the screen. */
export interface PlanDraft {
  name: string;
  shortName: string;
  isPublic: boolean;
  isGlobal: boolean;
  items: PlanExerciseItem[];
}

export const EMPTY_PLAN_DRAFT: PlanDraft = {
  name: "",
  shortName: "",
  isPublic: false,
  isGlobal: false,
  items: [],
};

export function draftFromPlan(plan: WorkoutPlan | null | undefined): PlanDraft {
  if (!plan) return EMPTY_PLAN_DRAFT;
  return {
    name: plan.name,
    shortName: plan.shortName ?? "",
    isPublic: plan.isPublic,
    isGlobal: plan.creatorUserId === null,
    items: plan.items
      .slice()
      .sort((a, b) => a.orderInPlan - b.orderInPlan)
      .map((item) => ({
        exerciseId: item.exerciseId,
        name: item.exercise.name,
        muscleGroups: item.exercise.muscleGroups,
      })),
  };
}

/** Appends an exercise; ignores duplicates (backend has a unique [planId, exerciseId]) and the 50-item cap. */
export function appendExercise(
  draft: PlanDraft,
  exercise: Pick<Exercise, "id" | "name" | "muscleGroups">,
): PlanDraft {
  if (draft.items.length >= MAX_PLAN_EXERCISES) return draft;
  if (draft.items.some((i) => i.exerciseId === exercise.id)) return draft;
  return {
    ...draft,
    items: [
      ...draft.items,
      { exerciseId: exercise.id, name: exercise.name, muscleGroups: exercise.muscleGroups },
    ],
  };
}

/** PWA PlanFormScreen.validate: the five checks in order. Null = OK. `creatorOf` gives an exercise's creator (null = built-in). */
export function planDraftError(
  draft: Pick<PlanDraft, "name" | "isPublic" | "isGlobal" | "items">,
  creatorOf: (exerciseId: string) => string | null | undefined,
): string | null {
  const name = draft.name.trim();
  if (name.length < 3) return "Nazwa planu musi mieć co najmniej 3 znaki";
  if (name.length > 100) return "Nazwa planu może mieć maksymalnie 100 znaków";
  if (draft.items.length === 0) return "Dodaj co najmniej 1 ćwiczenie";
  if (draft.items.length > MAX_PLAN_EXERCISES) return `Plan może zawierać maksymalnie ${MAX_PLAN_EXERCISES} ćwiczeń`;
  const privateOne = (draft.isPublic || draft.isGlobal) && draft.items.some((i) => {
    const creator = creatorOf(i.exerciseId);
    return creator !== null && creator !== undefined && creator !== "1";
  });
  return privateOne ? "Plan publiczny lub globalny nie może zawierać prywatnych ćwiczeń" : null;
}
