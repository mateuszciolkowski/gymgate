import React, { useMemo } from "react";
import type { DataContextType } from "./types";
import { DataContext } from "./context";
import { useDataStore } from "./useDataStore";
import { useDataSync } from "./useDataSync";
import { useWorkoutActions } from "./useWorkoutActions";
import { useWorkoutItemActions } from "./useWorkoutItemActions";
import { useExerciseActions } from "./useExerciseActions";
import { usePlanActions } from "./usePlanActions";

/**
 * DataProvider - Global store for application data
 * Offline-first approach z prostym cache'em
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const store = useDataStore();

  const syncActions = useDataSync(store);
  const workoutActions = useWorkoutActions(store);
  const workoutItemActions = useWorkoutItemActions(store);
  const exerciseActions = useExerciseActions(store);
  const planActions = usePlanActions(store);

  const {
    workouts,
    exercises,
    stats,
    statsOverview,
    activeWorkoutId,
    plans,
    isLoading,
    isOnline,
    lastSync,
    failedSyncOperations,
    getExerciseProgression,
  } = store;

  const value: DataContextType = useMemo(
    () => ({
      workouts,
      exercises,
      stats,
      statsOverview,
      activeWorkoutId,
      plans,
      isLoading,
      isOnline,
      lastSync,
      failedSyncOperations,
      getExerciseProgression,
      ...workoutActions,
      ...workoutItemActions,
      ...exerciseActions,
      ...planActions,
      ...syncActions,
    }),
    [
      workouts,
      exercises,
      stats,
      statsOverview,
      activeWorkoutId,
      plans,
      isLoading,
      isOnline,
      lastSync,
      failedSyncOperations,
      getExerciseProgression,
      workoutActions,
      workoutItemActions,
      exerciseActions,
      planActions,
      syncActions,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
