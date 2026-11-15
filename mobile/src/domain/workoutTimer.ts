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

/** "2h 5min" / "45 min" since the last activity (abandoned-workout dialog). */
export function fmtAgo(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}min` : `${minutes} min`;
}

/** Duration recorded when an abandoned workout is finished: last activity minus start (D-24, PWA handleCompleteStaleWorkout). */
export function abandonedDurationSeconds(workout: WorkoutTimerInput): number {
  return Math.max(0, Math.floor((computeWorkoutLastActivity(workout) - new Date(workout.createdAt).getTime()) / 1000));
}
