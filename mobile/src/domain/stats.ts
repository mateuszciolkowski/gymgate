import type { ExerciseProgression, ExerciseProgressPoint, StatsOverview, StatsProgressMetric } from "./types";
import { fromHundredths, normalizeWeight, toHundredths } from "./weight";

/**
 * Local statistics, same rules as backend workout.repository.ts (getExerciseProgression,
 * rebuildExerciseStatsFromCompletedWorkouts in workout.service.ts, getStatsOverview). Pure functions over
 * plain rows; weights are summed in integer hundredths of a kg. Only COMPLETED workouts count.
 */

export interface StatsSetRow {
  weight: string | number;
  repetitions: number;
  setNumber?: number;
}

export interface StatsItemRow {
  exerciseId: string;
  notes?: string | null;
  orderInWorkout?: number;
  sets: StatsSetRow[];
}

export interface StatsWorkoutRow {
  id: string;
  status: "DRAFT" | "COMPLETED";
  workoutDate: string;
  createdAt: string;
  items: StatsItemRow[];
}

export interface ProgressionPoint {
  workoutId: string;
  workoutDate: string;
  maxSetWeight: number;
  repetitionsAtMaxSet: number;
  volume: number;
}

const time = (iso: string) => new Date(iso).getTime();

/** workoutDate, then createdAt (same-day workouts tie on the date), then id for determinism. */
const byDateThenCreated = (a: StatsWorkoutRow, b: StatsWorkoutRow) =>
  time(a.workoutDate) - time(b.workoutDate) || time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const orderedSets = (item: StatsItemRow) =>
  item.sets.some((s) => s.setNumber !== undefined) ? [...item.sets].sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0)) : item.sets;

const orderedItems = (w: StatsWorkoutRow) =>
  w.items.some((i) => i.orderInWorkout !== undefined) ? [...w.items].sort((a, b) => (a.orderInWorkout ?? 0) - (b.orderInWorkout ?? 0)) : w.items;

/**
 * One point per completed workout containing the exercise: heaviest set (the FIRST set with that weight
 * wins the reps), volume = sum(weight x reps). Oldest first. `from`/`to` filter on workoutDate (inclusive).
 */
export function progression(
  workouts: StatsWorkoutRow[],
  exerciseId: string,
  range: { from?: string; to?: string } = {},
): ProgressionPoint[] {
  const points: ProgressionPoint[] = [];
  for (const w of workouts.filter((x) => x.status === "COMPLETED").sort(byDateThenCreated)) {
    if (range.from && time(w.workoutDate) < time(range.from)) continue;
    if (range.to && time(w.workoutDate) > time(range.to)) continue;
    let maxH = -1;
    let reps = 0;
    let volumeH = 0;
    let seen = false;
    for (const item of orderedItems(w)) {
      if (item.exerciseId !== exerciseId) continue;
      for (const s of orderedSets(item)) {
        const h = toHundredths(s.weight);
        seen = true;
        volumeH += h * s.repetitions;
        if (h > maxH) {
          maxH = h;
          reps = s.repetitions;
        }
      }
    }
    if (seen) {
      points.push({
        workoutId: w.id,
        workoutDate: w.workoutDate,
        maxSetWeight: maxH / 100,
        repetitionsAtMaxSet: reps,
        volume: volumeH / 100,
      });
    }
  }
  return points;
}

export function progressionSeries(
  exerciseId: string,
  points: ProgressionPoint[],
  metric: StatsProgressMetric = "maxSetWeight",
): ExerciseProgression {
  return {
    exerciseId,
    metric,
    points: points.map(
      (p): ExerciseProgressPoint => ({ ...p, value: metric === "volume" ? p.volume : p.maxSetWeight }),
    ),
  };
}

/** Record = point with the largest weight; on a tie the earliest one. */
export function recordPoint(points: ProgressionPoint[]): ProgressionPoint | null {
  return points.reduce<ProgressionPoint | null>((best, p) => (best === null || p.maxSetWeight > best.maxSetWeight ? p : best), null);
}

export const lastPoint = (points: ProgressionPoint[]): ProgressionPoint | null => points[points.length - 1] ?? null;

export const sessionCount = (points: ProgressionPoint[]): number => points.length;

export interface ExerciseStatsResult {
  exerciseId: string;
  maxWeight: string;
  maxWeightReps: number;
  maxWeightDate: string;
  lastWeight: string;
  lastReps: number;
  lastWorkoutDate: string;
  totalWorkouts: number;
  lastNote: string | null;
}

/** Note of the newest completed workout containing the exercise (empty -> null), like getLastWorkoutNote. */
function lastNote(workouts: StatsWorkoutRow[], exerciseId: string): string | null {
  const newestFirst = workouts.filter((w) => w.status === "COMPLETED").sort(byDateThenCreated).reverse();
  for (const w of newestFirst) {
    const item = orderedItems(w).find((i) => i.exerciseId === exerciseId);
    if (item) return item.notes || null;
  }
  return null;
}

/** ExerciseUserStats equivalent for one exercise; null when it has no completed workout. */
export function exerciseStats(workouts: StatsWorkoutRow[], exerciseId: string): ExerciseStatsResult | null {
  const points = progression(workouts, exerciseId);
  const max = recordPoint(points);
  const last = lastPoint(points);
  if (!max || !last) return null;
  return {
    exerciseId,
    maxWeight: fromHundredths(toHundredths(max.maxSetWeight)),
    maxWeightReps: max.repetitionsAtMaxSet,
    maxWeightDate: max.workoutDate,
    lastWeight: fromHundredths(toHundredths(last.maxSetWeight)),
    lastReps: last.repetitionsAtMaxSet,
    lastWorkoutDate: last.workoutDate,
    totalWorkouts: sessionCount(points),
    lastNote: lastNote(workouts, exerciseId),
  };
}

/** Stats for every exercise present in completed workouts, largest record first (GET /stats/all). */
export function allExerciseStats(workouts: StatsWorkoutRow[]): ExerciseStatsResult[] {
  const ids = new Set<string>();
  for (const w of workouts) if (w.status === "COMPLETED") for (const i of w.items) if (i.sets.length > 0) ids.add(i.exerciseId);
  return [...ids]
    .map((id) => exerciseStats(workouts, id))
    .filter((s): s is ExerciseStatsResult => s !== null)
    .sort((a, b) => toHundredths(b.maxWeight) - toHundredths(a.maxWeight));
}

/**
 * Month/year windows use the same calendar arithmetic as the server (`setMonth(-1)`, `setFullYear(-1)` from now).
 * Sets and volume cover all completed workouts.
 */
export function overview(workouts: StatsWorkoutRow[], now: Date = new Date()): StatsOverview {
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  let workoutsLastMonth = 0;
  let workoutsLastYear = 0;
  let totalSets = 0;
  let volumeH = 0;
  for (const w of workouts) {
    if (w.status !== "COMPLETED") continue;
    const t = time(w.workoutDate);
    if (t >= monthAgo.getTime()) workoutsLastMonth += 1;
    if (t >= yearAgo.getTime()) workoutsLastYear += 1;
    for (const i of w.items) {
      for (const s of i.sets) {
        totalSets += 1;
        volumeH += toHundredths(s.weight) * s.repetitions;
      }
    }
  }
  return { workoutsLastMonth, workoutsLastYear, totalSets, totalVolume: volumeH / 100 };
}

/**
 * "Aktualne" tab: per exercise the first set (setNumber 1, else the first) of its newest completed workout that
 * has sets (PWA computeFirstSetWeightMap).
 */
export function currentFirstSets(workouts: StatsWorkoutRow[]): Map<string, { weight: string; reps: number }> {
  const map = new Map<string, { weight: string; reps: number }>();
  for (const w of workouts.filter((x) => x.status === "COMPLETED").sort(byDateThenCreated).reverse()) {
    for (const item of w.items) {
      if (map.has(item.exerciseId)) continue;
      const first = item.sets.find((s) => s.setNumber === 1) ?? item.sets[0];
      if (first) map.set(item.exerciseId, { weight: normalizeWeight(first.weight), reps: first.repetitions });
    }
  }
  return map;
}

/** "Ostatnie sesje" text per workout: every set as "62.5 kg × 8", ordered by set number. */
export function setSummaries(workouts: StatsWorkoutRow[], exerciseId: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const w of workouts) {
    const item = w.items.find((i) => i.exerciseId === exerciseId);
    if (!item || item.sets.length === 0) continue;
    map.set(w.id, orderedSets(item).map((s) => `${normalizeWeight(s.weight)} kg × ${s.repetitions}`).join(", "));
  }
  return map;
}

/** The 8 newest points; "asc" re-orders those 8 oldest first (PWA sortedRecentPoints). */
export function recentPoints(points: ProgressionPoint[], order: "desc" | "asc"): ProgressionPoint[] {
  const recent = [...points].reverse().slice(0, 8);
  return order === "asc" ? recent.reverse() : recent;
}
