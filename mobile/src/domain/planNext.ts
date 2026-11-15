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
