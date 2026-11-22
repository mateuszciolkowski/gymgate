import { useCallback } from "react";
import { listExercises, loadCompletedForStats } from "@/db/repositories";
import type { Db } from "@/db/types";
import { allExerciseStats, currentFirstSets, overview, progression, setSummaries } from "@/domain/stats";
import { useDbQuery } from "@/providers";

/** Everything the stats list needs, computed from the local database (no network). */
export function useStats(active = true) {
  return useDbQuery(
    useCallback((db: Db) => {
      const rows = loadCompletedForStats(db);
      const names = new Map(listExercises(db).map((e) => [e.id, e.name]));
      return { overview: overview(rows), stats: allExerciseStats(rows), current: currentFirstSets(rows), names };
    }, []),
    active,
  );
}

export function useExerciseHistory(exerciseId: string) {
  return useDbQuery(
    useCallback(
      (db: Db) => {
        const rows = loadCompletedForStats(db);
        const stat = allExerciseStats(rows).find((s) => s.exerciseId === exerciseId) ?? null;
        const name = listExercises(db).find((e) => e.id === exerciseId)?.name ?? null;
        return { stat, name, points: progression(rows, exerciseId), summaries: setSummaries(rows, exerciseId) };
      },
      [exerciseId],
    ),
  );
}
