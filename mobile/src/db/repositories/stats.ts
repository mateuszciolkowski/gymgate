import { asc, eq, inArray } from "drizzle-orm";
import {
  allExerciseStats,
  exerciseStats,
  overview,
  progression,
  progressionSeries,
  type ExerciseStatsResult,
  type ProgressionPoint,
  type StatsWorkoutRow,
} from "../../domain/stats";
import type { ExerciseProgression, StatsOverview, StatsProgressMetric } from "../../domain/types";
import { workoutItems, workoutSets, workouts } from "../schema";
import type { Db } from "../types";
import { inChunks } from "./common";

/** Completed workouts with items and sets: the input of domain/stats.ts (statistics are never stored). */
export function loadCompletedForStats(db: Db): StatsWorkoutRow[] {
  const ws = db.select().from(workouts).where(eq(workouts.status, "COMPLETED")).all();
  const items = inChunks(
    ws.map((w) => w.id),
    (c) => db.select().from(workoutItems).where(inArray(workoutItems.workoutId, c)).orderBy(asc(workoutItems.orderInWorkout)).all(),
  );
  const sets = inChunks(
    items.map((i) => i.id),
    (c) => db.select().from(workoutSets).where(inArray(workoutSets.itemId, c)).orderBy(asc(workoutSets.setNumber)).all(),
  );
  const setsByItem = new Map<string, typeof sets>();
  for (const s of sets) setsByItem.set(s.itemId, [...(setsByItem.get(s.itemId) ?? []), s]);
  return ws.map((w) => ({
    id: w.id,
    status: w.status,
    workoutDate: w.workoutDate,
    createdAt: w.createdAt,
    items: items.filter((i) => i.workoutId === w.id).map((i) => ({ ...i, sets: setsByItem.get(i.id) ?? [] })),
  }));
}

export const getStatsOverview = (db: Db, now: Date = new Date()): StatsOverview => overview(loadCompletedForStats(db), now);

export const getAllStats = (db: Db): ExerciseStatsResult[] => allExerciseStats(loadCompletedForStats(db));

export const getExerciseStats = (db: Db, exerciseId: string): ExerciseStatsResult | null =>
  exerciseStats(loadCompletedForStats(db), exerciseId);

export function getProgression(
  db: Db,
  exerciseId: string,
  opts: { metric?: StatsProgressMetric; from?: string; to?: string } = {},
): ExerciseProgression {
  const points: ProgressionPoint[] = progression(loadCompletedForStats(db), exerciseId, opts);
  return progressionSeries(exerciseId, points, opts.metric);
}
