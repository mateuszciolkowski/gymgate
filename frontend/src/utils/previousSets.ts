import type { Workout } from "@/types/workout";

export interface PreviousSetData {
  setNumber: number;
  weight: string;
  repetitions: number;
}

interface PreviousSetsResult {
  latestSetsByExerciseId: Map<string, string>;
  previousSetsByExerciseId: Map<string, PreviousSetData[]>;
}

/**
 * "Last used weight/reps" must reflect what you actually logged, even if you
 * never tapped "Zakończ" on that session — a workout stuck in DRAFT still has
 * real sets in it. Only the current screen's workout is excluded; status is not
 * a filter here (unlike ExerciseUserStats/"Rekord", which stay COMPLETED-only
 * because those are official stats, not a convenience hint).
 */
export function computePreviousSets(
  workouts: Workout[],
  excludeWorkoutId: string,
): PreviousSetsResult {
  const latestSetsByExerciseId = new Map<string, string>();
  const previousSetsByExerciseId = new Map<string, PreviousSetData[]>();

  const sorted = [...workouts]
    .filter((w) => w.id !== excludeWorkoutId)
    .sort((a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime());

  sorted.forEach((w) => {
    w.items.forEach((item) => {
      if (previousSetsByExerciseId.has(item.exerciseId) || item.sets.length === 0) return;
      const sortedSets = [...item.sets]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((set) => ({ setNumber: set.setNumber, weight: set.weight, repetitions: set.repetitions }));
      previousSetsByExerciseId.set(item.exerciseId, sortedSets);
      latestSetsByExerciseId.set(
        item.exerciseId,
        sortedSets.map((set) => `${set.weight} kg × ${set.repetitions}`).join(", "),
      );
    });
  });

  return { latestSetsByExerciseId, previousSetsByExerciseId };
}
