// Plan history: pure helpers deciding which WorkoutPlanVersion rows to write.

export interface PlanSnapshotExercise {
  exerciseId: string;
  name: string;
}

export interface PlanSnapshot {
  name: string;
  shortName: string | null;
  isPublic: boolean;
  exercises: PlanSnapshotExercise[];
}

export interface PlanVersionInput extends PlanSnapshot {
  version: number;
  createdAt?: Date;
}

interface PlanWithItems {
  name: string;
  shortName: string | null;
  isPublic: boolean;
  updatedAt: Date;
  items: { exerciseId: string; orderInPlan: number; exercise: { name: string } }[];
}

export function toSnapshot(plan: Omit<PlanWithItems, "updatedAt">): PlanSnapshot {
  return {
    name: plan.name,
    shortName: plan.shortName,
    isPublic: plan.isPublic,
    exercises: [...plan.items]
      .sort((a, b) => a.orderInPlan - b.orderInPlan)
      .map((i) => ({ exerciseId: i.exerciseId, name: i.exercise.name })),
  };
}

// Compares by exercise ids, not names: a global exercise rename is not a plan change.
export function sameSnapshot(a: PlanSnapshot, b: PlanSnapshot): boolean {
  return (
    a.name === b.name &&
    a.shortName === b.shortName &&
    a.isPublic === b.isPublic &&
    a.exercises.map((e) => e.exerciseId).join() === b.exercises.map((e) => e.exerciseId).join()
  );
}

/**
 * Versions to insert after a plan update.
 * Plans created before history existed have no versions: their pre-edit state
 * becomes v1 (dated by the plan's last update), the new state v2.
 */
export function versionsToRecord(
  before: PlanWithItems,
  after: Omit<PlanWithItems, "updatedAt">,
  latest: (PlanSnapshot & { version: number }) | null,
): PlanVersionInput[] {
  const next = toSnapshot(after);
  if (!latest) {
    const prev = toSnapshot(before);
    const v1 = { version: 1, ...prev, createdAt: before.updatedAt };
    return sameSnapshot(prev, next) ? [v1] : [v1, { version: 2, ...next }];
  }
  return sameSnapshot(latest, next) ? [] : [{ version: latest.version + 1, ...next }];
}
