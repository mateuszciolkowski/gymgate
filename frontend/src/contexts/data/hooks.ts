import { useContext, useMemo } from "react";
import { DataContext } from "./context";

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// Pomocnicze hooki dla kompatybilności wstecznej
export function useWorkoutsData() {
  const {
    workouts,
    isLoading,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    syncNow,
  } = useData();
  return {
    workouts,
    loading: isLoading,
    error: null,
    createWorkout,
    updateWorkout: (id: string, data: Record<string, unknown>) =>
      updateWorkout(id, data),
    deleteWorkout,
    refetch: syncNow,
  };
}

export function useExercisesData() {
  const {
    exercises,
    isLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    syncNow,
  } = useData();
  return {
    exercises,
    loading: isLoading,
    error: null,
    addExercise: createExercise,
    updateExercise: (id: string, data: Record<string, unknown>) =>
      updateExercise(id, data),
    deleteExercise,
    refetch: syncNow,
  };
}

export function useActiveWorkoutData() {
  const { activeWorkoutId, isLoading, syncNow } = useData();
  return {
    activeWorkoutId,
    loading: isLoading,
    error: null,
    refetch: syncNow,
    clearActiveWorkout: async () => {},
  };
}

export function useWorkoutData(id: string) {
  const {
    getWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateWorkoutItem,
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    updateWorkout,
    refreshWorkout,
    isLoading,
  } = useData();

  const workout = getWorkout(id);

  // Memoizuj funkcje żeby nie tworzyć nowych przy każdym renderze
  const memoizedFunctions = useMemo(
    () => ({
      refetch: () => refreshWorkout(id),
      addExercise: (data: { exerciseId: string }) =>
        addExerciseToWorkout(id, data.exerciseId),
      addSet: (
        itemId: string,
        data: { weight: number; repetitions: number; setNumber: number },
      ) => addSet(id, itemId, data),
      updateSet: (
        setId: string,
        data: { weight?: number; repetitions?: number },
      ) => updateSet(id, setId, data),
      deleteSet: (itemId: string, setId: string) =>
        deleteSet(id, itemId, setId),
      deleteExercise: (itemId: string) => removeExerciseFromWorkout(id, itemId),
      updateExerciseNotes: (itemId: string, notes: string) =>
        updateWorkoutItem(id, itemId, { notes }),
      completeWorkout: (durationSeconds?: number) => completeWorkout(id, durationSeconds),
      updateWorkout: (data: Record<string, unknown>) => updateWorkout(id, data),
    }),
    [
      id,
      addExerciseToWorkout,
      removeExerciseFromWorkout,
      updateWorkoutItem,
      addSet,
      updateSet,
      deleteSet,
      completeWorkout,
      updateWorkout,
      refreshWorkout,
    ],
  );

  return {
    workout: workout || null,
    loading: isLoading && !workout,
    error: null,
    ...memoizedFunctions,
  };
}

export function useStatsData() {
  const {
    stats,
    statsOverview,
    workouts,
    isLoading,
    syncNow,
    getExerciseProgression,
  } = useData();
  return {
    stats,
    overview: statsOverview,
    workouts,
    loading: isLoading,
    error: null,
    refetch: syncNow,
    getExerciseProgression,
  };
}
