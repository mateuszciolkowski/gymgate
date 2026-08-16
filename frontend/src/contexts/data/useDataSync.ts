import { useCallback, useEffect, useMemo, useRef } from "react";
import { localStore, type SyncOperation } from "@/utils/localStore";
import { syncManager } from "@/utils/syncManager";
import type { Workout, ExerciseStats, StatsOverview, WorkoutPlan } from "@/types";
import type { Exercise } from "@/types";
import type { DataStore } from "./useDataStore";

/**
 * Synchronization lifecycle: online/offline listeners, initial load from
 * IndexedDB, sync manager subscriptions, and the syncNow/resetLocalCache actions.
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

  const currentUserIdRef = useRef<string | null>(null);

  // Listen for online/offline changes
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

  // Load local data on startup or when user changes
  useEffect(() => {
    if (!user) {
      currentUserIdRef.current = null;
      initialLoadDone.current = false;
      return;
    }

    const isDifferentUser = currentUserIdRef.current !== user.id;
    if (!isDifferentUser && initialLoadDone.current) return;

    currentUserIdRef.current = user.id;

    const loadLocalData = async () => {
      setIsLoading(true);

      try {
        if (isDifferentUser && initialLoadDone.current) {
          // Clear previous user's data
          await Promise.all([
            localStore.clear("workouts"),
            localStore.clear("stats"),
            localStore.clear("activeWorkout"),
            localStore.clear("pendingSync"),
            localStore.clear("metadata"),
          ]);
          idMappingRef.current.clear();
          progressionCacheRef.current.clear();
          setWorkouts([]);
          setStats([]);
          setStatsOverview(null);
          setActiveWorkoutId(null);
        }

        // Load from IndexedDB
        const [
          localWorkouts,
          localExercises,
          localStats,
          localStatsOverview,
          localActiveId,
          syncTime,
          localPlans,
          localIdMappings,
        ] = await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
          localStore.getLastSync(),
          localStore.getAll<WorkoutPlan>("plans"),
          localStore.getIdMappings(),
        ]);

        // Restore temp->real ID mappings (survive a page reload).
        Object.entries(localIdMappings).forEach(([tempId, realId]) => {
          idMappingRef.current.set(tempId, realId);
        });

        setWorkouts(localWorkouts);
        setExercises(localExercises);
        setStats(localStats);
        setStatsOverview(localStatsOverview ?? null);
        setActiveWorkoutId(localActiveId);
        setLastSync(syncTime);
        setPlans(localPlans);

        initialLoadDone.current = true;

        // Fetch fresh authoritative data from the server
        await fetchAllFromServer();
      } catch (error) {
        console.error("[DataProvider] Failed to load data:", error);
        await fetchAllFromServer();
      } finally {
        setIsLoading(false);
      }
    };

    loadLocalData();
  }, [
    user,
    fetchAllFromServer,
    idMappingRef,
    initialLoadDone,
    progressionCacheRef,
    setActiveWorkoutId,
    setExercises,
    setIsLoading,
    setLastSync,
    setPlans,
    setStats,
    setStatsOverview,
    setWorkouts,
  ]);

  // Start the sync manager
  useEffect(() => {
    if (!user) return;

    // Listen for sync completion
    const unsubscribe = syncManager.onSync(async () => {
      if (!initialLoadDone.current) return;

      try {
        const [
          serverWorkouts,
          serverExercises,
          serverStats,
          serverStatsOverview,
          serverActiveId,
          syncTime,
          serverPlans,
          storedIdMappings,
        ] = await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
          localStore.getLastSync(),
          localStore.getAll<WorkoutPlan>("plans"),
          localStore.getIdMappings(),
        ]);

        Object.entries(storedIdMappings).forEach(([tempId, realId]) => {
          idMappingRef.current.set(tempId, realId);
        });

        setWorkouts(serverWorkouts);
        setExercises(serverExercises);
        setStats(serverStats);
        setStatsOverview(serverStatsOverview ?? null);
        setActiveWorkoutId(serverActiveId);
        setLastSync(syncTime);
        setPlans(serverPlans);

        invalidateProgressionCache();
      } catch (error) {
        console.error("[DataProvider] Failed to reload data after sync:", error);
      }
    });

    const unsubscribeFailure = syncManager.onSyncFailure(
      (failedOps: SyncOperation[]) => {
        setFailedSyncOperations(failedOps);
      },
    );

    const unsubscribeWorkoutNotFound = syncManager.onWorkoutNotFound(
      async (workoutId: string) => {
        console.warn(
          `[DataProvider] Workout ${workoutId} not found on server, purging local state...`,
        );
        await purgeLocalWorkout(workoutId);
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
    idMappingRef,
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
