import type { PreviousSetData } from "./previousSets";

export interface DraftValues {
  weight: string;
  reps: string;
}

interface DraftSource {
  /** Sets of the item, ascending by number. */
  sets: Array<{ setNumber: number; weight: string; repetitions: number }>;
  /** Sets of this exercise in the latest other workout. */
  previousSets?: PreviousSetData[];
  /** Completed-workout stats of the exercise ("Ostatnio"). */
  stats?: { lastWeight: string; lastReps: number };
}

/**
 * Pre-filled values of a new set (WorkoutItemCard): the last set of this exercise; else the same-numbered set of the
 * previous session; else the stats of the last completed workout; else 0 kg x 1.
 */
export function draftDefaults({ sets, previousSets, stats }: DraftSource): DraftValues {
  const last = sets[sets.length - 1];
  if (last) return { weight: String(Math.max(Number(last.weight), 0)), reps: String(last.repetitions) };
  const prev = previousSets?.find((p) => p.setNumber === 1);
  if (prev) return { weight: prev.weight, reps: String(prev.repetitions) };
  return { weight: String(stats?.lastWeight ?? 0), reps: String(stats?.lastReps ?? 1) };
}
