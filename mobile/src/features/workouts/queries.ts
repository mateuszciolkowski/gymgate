import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveWorkout, getAllStats, getPlan, getStatsOverview, getWorkout, listPlansForWorkoutPicker, listWorkouts, listExercises } from "@/db/repositories";
import type { Db } from "@/db/types";
import { computePreviousSets } from "@/domain/previousSets";
import { computeWorkoutElapsed } from "@/domain/workoutTimer";
import type { Workout } from "@/domain/types";
import { useDb, useDbQuery } from "@/providers";
import { getClockOffset } from "@/sync/clock";
import { initialPullDone } from "@/sync";

/** Trainings tab: every workout (newest first) plus the activity-bar numbers. */
export function useTrainings(active = true) {
  const read = useCallback((db: Db) => ({ workouts: listWorkouts(db), overview: getStatsOverview(db) }), []);
  return useDbQuery(read, active);
}

export function useWorkout(id: string): Workout | null {
  return useDbQuery(useCallback((db: Db) => getWorkout(db, id), [id]));
}

export function useActiveWorkout(): Workout | null {
  return useDbQuery(useCallback((db: Db) => getActiveWorkout(db), []));
}

/** Everything the workout screen needs besides the workout: previous sessions' sets and the stats of every exercise. */
export function useWorkoutScreen(id: string) {
  const read = useCallback(
    (db: Db) => {
      const workout = getWorkout(db, id);
      return {
        workout,
        plan: workout?.workoutPlanId ? getPlan(db, workout.workoutPlanId) : null,
        stats: new Map(getAllStats(db).map((s) => [s.exerciseId, s])),
      };
    },
    [id],
  );
  const data = useDbQuery(read);
  // Previous sessions only change when this workout's exercises do: not re-hydrating the whole history on every set.
  const { db } = useDb();
  const exerciseKey = data.workout?.items.map((i) => i.exerciseId).join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previous = useMemo(() => computePreviousSets(listWorkouts(db), id), [db, id, exerciseKey]);
  return { ...data, previous };
}

export function usePlansForNewWorkout(userId: string) {
  return useDbQuery(useCallback((db: Db) => listPlansForWorkoutPicker(db, userId), [userId]));
}

export function useExercises(active = true) {
  return useDbQuery(useCallback((db: Db) => listExercises(db), []), active);
}

/** True once the first full pull finished (until then the app shows "pobieranie danych"). */
export function useInitialPullDone(): boolean {
  return useDbQuery(useCallback((db: Db) => initialPullDone(db), []));
}

/**
 * Seconds of a DRAFT workout, recomputed every second from its timestamps (so it is right after backgrounding,
 * a locked screen or a killed app). One function for the workout screen and the bottom bar (D-16).
 */
export function useWorkoutElapsed(workout: Workout | null): number {
  const { db } = useDb();
  const [now, setNow] = useState(() => Date.now());
  const running = workout !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return workout ? computeWorkoutElapsed(workout, now + getClockOffset(db)).elapsed : 0;
}
