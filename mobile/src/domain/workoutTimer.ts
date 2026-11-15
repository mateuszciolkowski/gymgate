export const STALE_WORKOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

interface WorkoutTimerInput {
  createdAt: string;
  updatedAt: string;
  items: Array<{
    updatedAt: string;
    sets: Array<{ updatedAt: string }>;
  }>;
}

export function computeWorkoutLastActivity(workout: WorkoutTimerInput): number {
  let latest = new Date(workout.updatedAt).getTime();
  for (const item of workout.items) {
    latest = Math.max(latest, new Date(item.updatedAt).getTime());
    for (const set of item.sets) {
      latest = Math.max(latest, new Date(set.updatedAt).getTime());
    }
  }
  return latest;
}

/**
 * Returns the elapsed seconds and whether the workout is considered stale.
 * When stale, elapsed is capped at lastActivity - createdAt to avoid recording
 * idle time (e.g. a 1h workout abandoned yesterday shows 23h without this cap).
 */
export function computeWorkoutElapsed(
  workout: WorkoutTimerInput,
  now: number = Date.now(),
  staleMs: number = STALE_WORKOUT_MS,
): { elapsed: number; isStale: boolean } {
  const startedAt = new Date(workout.createdAt).getTime();
  const lastActivity = computeWorkoutLastActivity(workout);
  const isStale = now - lastActivity > staleMs;
  const effectiveEnd = isStale ? lastActivity : now;
  const elapsed = Math.max(0, Math.floor((effectiveEnd - startedAt) / 1000));
  return { elapsed, isStale };
}
