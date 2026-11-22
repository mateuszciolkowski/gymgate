import type { WorkoutPlan } from "@/types/workout";

export type PlanItemState = "added" | "next" | "skipped" | "todo";

/** Every plan exercise in plan order with its state in the workout (same rule as the app's `planChecklist`). */
export function planChecklist(plan: WorkoutPlan | undefined, addedExerciseIds: string[], skippedExerciseIds: string[]) {
  if (!plan) return [];
  const added = new Set(addedExerciseIds);
  const skipped = new Set(skippedExerciseIds);
  const sorted = [...plan.items].sort((a, b) => a.orderInPlan - b.orderInPlan);
  const next = sorted.find((i) => !added.has(i.exerciseId) && !skipped.has(i.exerciseId))?.exerciseId;
  return sorted.map((i) => ({
    ...i,
    state: (added.has(i.exerciseId) ? "added" : i.exerciseId === next ? "next" : skipped.has(i.exerciseId) ? "skipped" : "todo") as PlanItemState,
  }));
}
