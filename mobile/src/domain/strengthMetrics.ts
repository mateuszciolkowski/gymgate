/** Estimated 1RM and per-session strength series. Same rules as frontend/src/utils/strengthMetrics.ts (parity fixture shared/parity/strengthMetrics.json). */
export type StrengthMetric = "weight" | "e1rm" | "volume";

export interface SessionPoint {
  workoutId: string;
  workoutDate: string;
  value: number;
}

interface MetricsWorkout {
  id: string;
  status: string;
  workoutDate: string;
  createdAt: string;
  items: Array<{ exerciseId: string; sets: Array<{ weight: string | number; repetitions: number }> }>;
}

const round = (x: number, decimals: number) => Math.round(x * 10 ** decimals) / 10 ** decimals;
const time = (iso: string) => new Date(iso).getTime();

/** Epley estimated one-rep max, 1 decimal: weight x (1 + reps / 30); a single rep is the weight itself. */
export function estimate1RM(weight: number | string, reps: number): number {
  const w = Number(weight);
  return reps === 1 ? round(w, 1) : round(w * (1 + reps / 30), 1);
}

/**
 * One point per COMPLETED workout containing the exercise, oldest first (workoutDate, then createdAt, then id).
 * weight = heaviest set, e1rm = best estimated 1RM of its sets, volume = sum of weight x reps (2 decimals).
 */
export function sessionSeries(workouts: MetricsWorkout[], exerciseId: string, metric: StrengthMetric): SessionPoint[] {
  const points: SessionPoint[] = [];
  const ordered = workouts
    .filter((w) => w.status === "COMPLETED")
    .sort((a, b) => time(a.workoutDate) - time(b.workoutDate) || time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const w of ordered) {
    const sets = w.items.filter((i) => i.exerciseId === exerciseId).flatMap((i) => i.sets);
    if (sets.length === 0) continue;
    const value =
      metric === "weight"
        ? Math.max(...sets.map((s) => Number(s.weight)))
        : metric === "e1rm"
          ? Math.max(...sets.map((s) => estimate1RM(s.weight, s.repetitions)))
          : round(sets.reduce((sum, s) => sum + Number(s.weight) * s.repetitions, 0), 2);
    points.push({ workoutId: w.id, workoutDate: w.workoutDate, value });
  }
  return points;
}

/** Best estimated 1RM across all completed workouts (0 when there are none). */
export const bestE1RM = (workouts: MetricsWorkout[], exerciseId: string): number =>
  Math.max(0, ...sessionSeries(workouts, exerciseId, "e1rm").map((p) => p.value));
