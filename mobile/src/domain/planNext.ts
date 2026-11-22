interface PlanLike {
  items: Array<{ exerciseId: string; orderInPlan: number }>;
}

/** Next plan exercise to suggest: plan order, minus exercises already in the workout or skipped. */
export function nextFromPlan(
  plan: PlanLike | null | undefined,
  addedExerciseIds: Iterable<string>,
  skippedExerciseIds: Iterable<string>,
): { exerciseId: string; orderInPlan: number } | null {
  if (!plan) return null;
  const done = new Set([...addedExerciseIds, ...skippedExerciseIds]);
  return [...plan.items].sort((a, b) => a.orderInPlan - b.orderInPlan).find((i) => !done.has(i.exerciseId)) ?? null;
}

/** Remaining count (0 = "Plan completed" indicator). */
export function remainingFromPlan(
  plan: PlanLike | null | undefined,
  addedExerciseIds: Iterable<string>,
  skippedExerciseIds: Iterable<string>,
): number {
  if (!plan) return 0;
  const done = new Set([...addedExerciseIds, ...skippedExerciseIds]);
  return plan.items.filter((i) => !done.has(i.exerciseId)).length;
}

export type PlanItemState = "added" | "next" | "skipped" | "todo";

/** Every plan exercise in plan order with its state in the workout (plan checklist sheet). */
export function planChecklist<T extends { exerciseId: string; orderInPlan: number }>(
  plan: { items: T[] } | null | undefined,
  addedExerciseIds: Iterable<string>,
  skippedExerciseIds: Iterable<string>,
): Array<T & { state: PlanItemState }> {
  if (!plan) return [];
  const added = new Set(addedExerciseIds);
  const skipped = new Set(skippedExerciseIds);
  const next = nextFromPlan(plan, added, skipped)?.exerciseId;
  return [...plan.items]
    .sort((a, b) => a.orderInPlan - b.orderInPlan)
    .map((i) => ({ ...i, state: added.has(i.exerciseId) ? "added" : i.exerciseId === next ? "next" : skipped.has(i.exerciseId) ? "skipped" : "todo" }));
}
