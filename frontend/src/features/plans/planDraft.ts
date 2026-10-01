import type { Exercise, WorkoutPlan } from "@/types";

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
