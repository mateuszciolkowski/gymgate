import { useState, useCallback, useRef } from "react";
import { localStore } from "@/utils/localStore";
import type { SyncOperation } from "@/utils/localStore";
import { syncManager } from "@/utils/syncManager";
import { authFetch } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import { useAuth } from "../AuthContext";
import type {
  Workout,
  ExerciseStats,
  ExerciseProgression,
  StatsOverview,
  StatsProgressMetric,
  WorkoutPlan,
} from "@/types";
import type { Exercise } from "@/hooks/useExercises";

export type DataStore = ReturnType<typeof useDataStore>;

/**
 * Wewnętrzny rdzeń DataProvider: stan, refy i współdzielone helpery
 * (mapowanie temp ID, kolejka sync, cache statystyk, pobieranie z serwera).
 */
export function useDataStore() {
  const { user } = useAuth();

  // Stan
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [statsOverview, setStatsOverview] = useState<StatsOverview | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(0);
  const [failedSyncOperations, setFailedSyncOperations] = useState<SyncOperation[]>([]);

  const initialLoadDone = useRef(false);
  const progressionCacheRef = useRef<Map<string, ExerciseProgression>>(new Map());

  // Refy mirrorujące stan - żeby callbacks nie zależały od state
  const exercisesRef = useRef<Exercise[]>([]);
  exercisesRef.current = exercises;

  const workoutsRef = useRef<Workout[]>([]);
  workoutsRef.current = workouts;

  const statsRef = useRef<ExerciseStats[]>([]);
  statsRef.current = stats;

  const plansRef = useRef<WorkoutPlan[]>([]);
  plansRef.current = plans;

  // Mapowanie tymczasowych ID na prawdziwe - nie powoduje re-renderów
  const idMappingRef = useRef<Map<string, string>>(new Map());

  // Pobierz prawdziwe ID (lub tymczasowe jeśli nie ma mapowania)
  const getRealId = useCallback(
    (tempId: string): string => idMappingRef.current.get(tempId) || tempId,
    [],
  );

  const isOfflineError = useCallback(
    (error: unknown): boolean => !navigator.onLine || error instanceof TypeError,
    [],
  );

  const queueSyncOperation = useCallback(
    async (operation: {
      type: "create" | "update" | "delete";
      entity: "workout" | "exercise" | "set" | "workoutItem";
      workoutId?: string;
      endpoint: string;
      method: string;
      data?: unknown;
    }) => {
      await syncManager.queueOperation(operation);
    },
    [],
  );

  const removePendingOperationsReferencingIds = useCallback(
    async (ids: string[]) => {
      const nonEmptyIds = ids.filter(Boolean);
      if (nonEmptyIds.length === 0) return;

      const operations = await localStore.getPendingSyncOperations();
      const operationsToRemove = operations.filter((operation) => {
        if (
          operation.workoutId &&
          nonEmptyIds.includes(operation.workoutId)
        ) {
          return true;
        }

        if (nonEmptyIds.some((id) => operation.endpoint.includes(id))) return true;

        if (!operation.data) return false;

        try {
          const serialized = JSON.stringify(operation.data);
          return nonEmptyIds.some((id) => serialized.includes(id));
        } catch {
          return false;
        }
      });

      if (operationsToRemove.length === 0) return;

      await Promise.all(
        operationsToRemove.map((operation) => localStore.removePendingSync(operation.id)),
      );
    },
    [],
  );

  const removePendingOperationsReferencingTempId = useCallback(
    async (tempId: string) => {
      if (!tempId.startsWith("temp_")) return;

      await removePendingOperationsReferencingIds([tempId]);
    },
    [removePendingOperationsReferencingIds],
  );

  const purgeLocalWorkout = useCallback(
    async (workoutId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const workout = workoutsRef.current.find(
        (entry) => entry.id === workoutId || entry.id === realWorkoutId,
      );

      const idsToCleanup = new Set<string>([workoutId, realWorkoutId]);
      if (workout) {
        idsToCleanup.add(workout.id);
        idsToCleanup.add(getRealId(workout.id));
        workout.items.forEach((item) => {
          idsToCleanup.add(item.id);
          idsToCleanup.add(getRealId(item.id));
          item.sets.forEach((set) => {
            idsToCleanup.add(set.id);
            idsToCleanup.add(getRealId(set.id));
          });
        });
      }

      const cleanupIds = Array.from(idsToCleanup).filter(Boolean);
      await removePendingOperationsReferencingIds(cleanupIds);

      setWorkouts((prev) =>
        prev.filter((entry) => !idsToCleanup.has(entry.id)),
      );
      const deleteResults = await Promise.allSettled(
        cleanupIds.map((id) => localStore.delete("workouts", id)),
      );
      deleteResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[DataProvider] Failed to delete local workout cache for id ${cleanupIds[index]}:`,
            result.reason,
          );
        }
      });

      setFailedSyncOperations((prev) =>
        prev.filter(
          (operation) =>
            !(
              (operation.workoutId &&
                idsToCleanup.has(operation.workoutId)) ||
              cleanupIds.some((id) => operation.endpoint.includes(id))
            ),
        ),
      );

      setActiveWorkoutId((current) => {
        if (current && idsToCleanup.has(current)) {
          return null;
        }
        return current;
      });

      const persistedActiveWorkoutId = await localStore.getActiveWorkoutId();
      if (
        persistedActiveWorkoutId &&
        idsToCleanup.has(persistedActiveWorkoutId)
      ) {
        await localStore.setActiveWorkoutId(null);
      }

      for (const [tempId, mappedId] of idMappingRef.current.entries()) {
        if (idsToCleanup.has(tempId) || idsToCleanup.has(mappedId)) {
          idMappingRef.current.delete(tempId);
        }
      }
    },
    [getRealId, removePendingOperationsReferencingIds],
  );

  const invalidateProgressionCache = useCallback(
    async (exerciseId?: string) => {
      const keysToDelete = Array.from(progressionCacheRef.current.keys()).filter(
        (key) => !exerciseId || key.startsWith(`${exerciseId}:`),
      );
      keysToDelete.forEach((key) => progressionCacheRef.current.delete(key));

      try {
        const metadataEntries = await localStore.getAll<{ key?: string }>("metadata");
        const metadataPrefix = "statsProgression:";
        const targetPrefix = exerciseId
          ? `${metadataPrefix}${exerciseId}:`
          : metadataPrefix;
        const keys = metadataEntries
          .map((entry) => entry?.key)
          .filter(
            (key): key is string => !!key && key.startsWith(targetPrefix),
          );

        if (keys.length > 0) {
          await Promise.all(keys.map((key) => localStore.delete("metadata", key)));
        }
      } catch (error) {
        console.error("[DataProvider] Failed to invalidate progression cache:", error);
      }
    },
    [],
  );

  const refreshStatsData = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const [statsRes, overviewRes] = await Promise.all([
        authFetch(`${API_BASE}/api/workouts/stats/all`),
        authFetch(`${API_BASE}/api/workouts/stats/overview`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        const statsPayload = data.data || [];
        setStats(statsPayload);
        await localStore.clear("stats");
        await localStore.putMany("stats", statsPayload);
      }

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        const overviewPayload = data.data || null;
        setStatsOverview(overviewPayload);
        await localStore.setMetadata("statsOverview", overviewPayload);
      }
    } catch (error) {
      console.error("[DataProvider] Failed to refresh stats:", error);
    }
  }, []);

  const getExerciseProgression = useCallback(
    async (
      exerciseId: string,
      metric: StatsProgressMetric = "maxSetWeight",
    ): Promise<ExerciseProgression> => {
      const cacheKey = `${exerciseId}:${metric}`;
      const cached = progressionCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const metadataKey = `statsProgression:${cacheKey}`;
      if (!navigator.onLine) {
        const localCached = await localStore.getMetadata<ExerciseProgression | null>(
          metadataKey,
        );
        if (localCached) {
          progressionCacheRef.current.set(cacheKey, localCached);
          return localCached;
        }
      }

      const response = await authFetch(
        `${API_BASE}/api/workouts/stats/progression/${exerciseId}?metric=${metric}`,
      );
      if (!response.ok) throw new Error("Błąd ładowania progresu ćwiczenia");

      const payload = await response.json();
      const progression: ExerciseProgression = payload.data;
      progressionCacheRef.current.set(cacheKey, progression);
      await localStore.setMetadata(metadataKey, progression);
      return progression;
    },
    [],
  );

  // Pobierz wszystkie dane z serwera
  const fetchAllFromServer = useCallback(async () => {
    if (!isOnline) return;

    const pendingOps = await localStore.getPendingSyncOperations();
    const hasPendingWorkoutMutations = pendingOps.some(
      (op) => op.entity === "workout" || op.entity === "workoutItem" || op.entity === "set",
    );

    try {
      const [workoutsRes, exercisesRes, activeRes, statsRes, overviewRes, plansMineRes, plansBuiltinRes, plansCommunityRes] =
        await Promise.all([
          !hasPendingWorkoutMutations
            ? authFetch(`${API_BASE}/api/workouts`).catch(() => null)
            : Promise.resolve(null),
          authFetch(`${API_BASE}/api/exercises`).catch(() => null),
          !hasPendingWorkoutMutations
            ? authFetch(`${API_BASE}/api/workouts/active`).catch(() => null)
            : Promise.resolve(null),
          authFetch(`${API_BASE}/api/workouts/stats/all`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/stats/overview`).catch(() => null),
          authFetch(`${API_BASE}/api/plans?tab=mine`).catch(() => null),
          authFetch(`${API_BASE}/api/plans?tab=builtin`).catch(() => null),
          authFetch(`${API_BASE}/api/plans?tab=community`).catch(() => null),
        ]);

      const persistenceJobs: Array<Promise<void>> = [];

      if (workoutsRes?.ok) {
        const data = await workoutsRes.json();
        const newWorkouts = data.data || [];
        setWorkouts(newWorkouts);
        persistenceJobs.push(
          (async () => {
            await localStore.clear("workouts");
            await localStore.putMany("workouts", newWorkouts);
          })(),
        );
      }

      if (exercisesRes?.ok) {
        const data = await exercisesRes.json();
        const newExercises = data.data || [];
        setExercises(newExercises);
        persistenceJobs.push(
          (async () => {
            await localStore.clear("exercises");
            await localStore.putMany("exercises", newExercises);
          })(),
        );
      }

      if (activeRes?.ok) {
        const data = await activeRes.json();
        const id = data.data?.activeWorkoutId || null;
        setActiveWorkoutId(id);
        persistenceJobs.push(localStore.setActiveWorkoutId(id));
      }

      if (statsRes?.ok) {
        const data = await statsRes.json();
        const newStats = data.data || [];
        setStats(newStats);
        persistenceJobs.push(
          (async () => {
            await localStore.clear("stats");
            await localStore.putMany("stats", newStats);
          })(),
        );
      }

      if (overviewRes?.ok) {
        const data = await overviewRes.json();
        const overview = data.data || null;
        setStatsOverview(overview);
        persistenceJobs.push(localStore.setMetadata("statsOverview", overview));
      }

      const plansAll: WorkoutPlan[] = [];
      for (const res of [plansMineRes, plansBuiltinRes, plansCommunityRes]) {
        if (res?.ok) {
          const data = await res.json();
          plansAll.push(...(data.data || []));
        }
      }
      if (plansAll.length > 0 || (plansMineRes?.ok && plansBuiltinRes?.ok && plansCommunityRes?.ok)) {
        const uniquePlans = Array.from(new Map(plansAll.map((p) => [p.id, p])).values());
        setPlans(uniquePlans);
        persistenceJobs.push(
          (async () => {
            await localStore.clear("plans");
            await localStore.putMany("plans", uniquePlans);
          })(),
        );
      }

      await Promise.all(persistenceJobs);
      const syncTimestamp = Date.now();
      await localStore.setLastSync(syncTimestamp);
      setLastSync(syncTimestamp);
    } catch (error) {
      console.error("[DataProvider] Failed to fetch from server:", error);
    }
  }, [isOnline]);

  return {
    user,
    // stan
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
    // settery
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
    // refy
    initialLoadDone,
    progressionCacheRef,
    exercisesRef,
    workoutsRef,
    statsRef,
    plansRef,
    idMappingRef,
    // helpery
    getRealId,
    isOfflineError,
    queueSyncOperation,
    removePendingOperationsReferencingIds,
    removePendingOperationsReferencingTempId,
    purgeLocalWorkout,
    invalidateProgressionCache,
    refreshStatsData,
    getExerciseProgression,
    fetchAllFromServer,
  };
}
