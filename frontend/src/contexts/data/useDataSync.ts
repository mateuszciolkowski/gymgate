import { useCallback, useEffect, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { syncManager } from "@/utils/syncManager";
import type { Workout, ExerciseStats, StatsOverview, WorkoutPlan } from "@/types";
import type { Exercise } from "@/types";
import type { DataStore } from "./useDataStore";

/**
 * Cykl życia synchronizacji: nasłuch online/offline, początkowe ładowanie
 * z IndexedDB, subskrypcje sync managera oraz akcje syncNow/resetLocalCache.
 */
export function useDataSync(store: DataStore) {
  const {
    user,
    initialLoadDone,
    progressionCacheRef,
    idMappingRef,
    setWorkouts,
    setExercises,
    setStats,
    setStatsOverview,
    setActiveWorkoutId,
    setPlans,
    setIsLoading,
    setIsOnline,
    setLastSync,
    setFailedSyncOperations,
    invalidateProgressionCache,
    purgeLocalWorkout,
    fetchAllFromServer,
  } = store;

  // Nasłuchuj na zmiany online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  // Załaduj dane lokalne przy starcie
  useEffect(() => {
    if (!user || initialLoadDone.current) return;

    const loadLocalData = async () => {
      setIsLoading(true);

      try {
        // Załaduj z IndexedDB
        const [
          localWorkouts,
          localExercises,
          localStats,
          localStatsOverview,
          localActiveId,
          syncTime,
          localPlans,
        ] = await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
          localStore.getLastSync(),
          localStore.getAll<WorkoutPlan>("plans"),
        ]);

        setWorkouts(localWorkouts);
        setExercises(localExercises);
        setStats(localStats);
        setStatsOverview(localStatsOverview ?? null);
        setActiveWorkoutId(localActiveId);
        setLastSync(syncTime);
        setPlans(localPlans);

        initialLoadDone.current = true;

        // Jeśli dane są stale (> 5 min) lub puste, pobierz świeże
        const isStale = Date.now() - syncTime > 5 * 60 * 1000;
        const isEmpty =
          localWorkouts.length === 0 && localExercises.length === 0;

        if (isStale || isEmpty) {
          await fetchAllFromServer();
        }
      } catch (error) {
        console.error("[DataProvider] Failed to load local data:", error);
        // Fallback do serwera
        await fetchAllFromServer();
      } finally {
        setIsLoading(false);
      }
    };

    loadLocalData();
  }, [
    user,
    fetchAllFromServer,
    initialLoadDone,
    setActiveWorkoutId,
    setExercises,
    setIsLoading,
    setLastSync,
    setPlans,
    setStats,
    setStatsOverview,
    setWorkouts,
  ]);

  // Uruchom sync manager
  useEffect(() => {
    if (!user) return;

    // Nasłuchuj na zakończenie synchronizacji
    const unsubscribe = syncManager.onSync(async () => {
      // Pomiń jeśli lokalne dane nie zostały jeszcze załadowane (Fix C: brak wyścigu)
      if (!initialLoadDone.current) return;

      // Po synchronizacji odśwież dane z lokalnego store
      const [
        localWorkouts,
        localExercises,
        localStats,
        localStatsOverview,
        localActiveId,
        localPlans,
      ] =
        await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
          localStore.getAll<WorkoutPlan>("plans"),
        ]);

      // Aktualizuj tylko jeśli dane się zmieniły (porównaj JSON)
      setWorkouts((prev) => {
        const newJson = JSON.stringify(localWorkouts);
        const prevJson = JSON.stringify(prev);
        return newJson !== prevJson ? localWorkouts : prev;
      });

      setExercises((prev) => {
        const newJson = JSON.stringify(localExercises);
        const prevJson = JSON.stringify(prev);
        return newJson !== prevJson ? localExercises : prev;
      });

      setStats((prev) => {
        const newJson = JSON.stringify(localStats);
        const prevJson = JSON.stringify(prev);
        return newJson !== prevJson ? localStats : prev;
      });

      setStatsOverview((prev) => {
        const newJson = JSON.stringify(localStatsOverview ?? null);
        const prevJson = JSON.stringify(prev ?? null);
        return newJson !== prevJson ? (localStatsOverview ?? null) : prev;
      });

      setActiveWorkoutId((prev) =>
        prev !== localActiveId ? localActiveId : prev,
      );

      setPlans((prev) => {
        const newJson = JSON.stringify(localPlans);
        const prevJson = JSON.stringify(prev);
        return newJson !== prevJson ? localPlans : prev;
      });

      await invalidateProgressionCache();
      // Nie wywołujemy setLastSync - powoduje niepotrzebny re-render
    });

    // Nasłuchuj na permanentnie nieudane operacje (Fix B)
    const unsubscribeFailure = syncManager.onSyncFailure((ops) => {
      setFailedSyncOperations((prev) => [...prev, ...ops]);
    });
    const unsubscribeWorkoutNotFound = syncManager.onWorkoutNotFound(
      (workoutId) => {
        purgeLocalWorkout(workoutId).catch((error) => {
          console.error("[DataProvider] Failed to purge orphaned workout:", error);
        });
      },
    );

    syncManager.start();

    return () => {
      unsubscribe();
      unsubscribeFailure();
      unsubscribeWorkoutNotFound();
      syncManager.stop();
    };
  }, [
    user,
    initialLoadDone,
    invalidateProgressionCache,
    purgeLocalWorkout,
    setActiveWorkoutId,
    setExercises,
    setFailedSyncOperations,
    setPlans,
    setStats,
    setStatsOverview,
    setWorkouts,
  ]);

  const syncNow = useCallback(async () => {
    await syncManager.syncNow();
  }, []);

  const resetLocalCache = useCallback(async () => {
    await Promise.all([
      localStore.clear("workouts"),
      localStore.clear("exercises"),
      localStore.clear("stats"),
      localStore.clear("activeWorkout"),
      localStore.clear("pendingSync"),
      localStore.clear("metadata"),
    ]);

    idMappingRef.current.clear();
    progressionCacheRef.current.clear();
    setFailedSyncOperations([]);
    setWorkouts([]);
    setExercises([]);
    setStats([]);
    setStatsOverview(null);
    setActiveWorkoutId(null);
    setLastSync(0);

    await fetchAllFromServer();
  }, [
    fetchAllFromServer,
    idMappingRef,
    progressionCacheRef,
    setActiveWorkoutId,
    setExercises,
    setFailedSyncOperations,
    setLastSync,
    setStats,
    setStatsOverview,
    setWorkouts,
  ]);

  const dismissSyncFailures = useCallback(() => {
    setFailedSyncOperations([]);
  }, [setFailedSyncOperations]);

  return useMemo(
    () => ({ syncNow, resetLocalCache, dismissSyncFailures }),
    [syncNow, resetLocalCache, dismissSyncFailures],
  );
}
