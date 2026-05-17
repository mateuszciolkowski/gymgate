/* eslint-disable react-refresh/only-export-components */
/**
 * DataContext - Globalny store dla danych aplikacji
 * Offline-first approach z prostym cache'em
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { localStore } from "../utils/localStore";
import type { SyncOperation } from "../utils/localStore";
import { syncManager } from "../utils/syncManager";
import { authFetch, getAuthHeaders } from "../utils/auth";
import { useAuth } from "./AuthContext";
import type {
  Workout,
  WorkoutItem,
  WorkoutSet,
  ExerciseStats,
  ExerciseProgression,
  StatsOverview,
  StatsProgressMetric,
  WorkoutPlan,
} from "@/types";
import type { Exercise } from "@/hooks/useExercises";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class WorkoutNotFoundError extends Error {
  constructor(message = "Workout not found") {
    super(message);
    this.name = "WorkoutNotFoundError";
  }
}

interface DataContextType {
  // Dane
  workouts: Workout[];
  exercises: Exercise[];
  stats: ExerciseStats[];
  statsOverview: StatsOverview | null;
  activeWorkoutId: string | null;
  plans: WorkoutPlan[];

  // Stan
  isLoading: boolean;
  isOnline: boolean;
  lastSync: number;

  // Akcje - Workouts
  createWorkout: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate?: string;
    workoutPlanId?: string;
  }) => Promise<Workout>;
  updateWorkout: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkout: (id: string) => Workout | undefined;

  // Akcje - Exercises
  createExercise: (data: {
    name: string;
    muscleGroups: string[];
    description?: string;
  }) => Promise<Exercise>;
  updateExercise: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;

  // Akcje - Workout Items & Sets
  addExerciseToWorkout: (
    workoutId: string,
    exerciseId: string,
  ) => Promise<void>;
  removeExerciseFromWorkout: (
    workoutId: string,
    itemId: string,
  ) => Promise<void>;
  updateWorkoutItem: (
    workoutId: string,
    itemId: string,
    data: { notes?: string | null },
  ) => Promise<void>;
  addSet: (
    workoutId: string,
    itemId: string,
    data: { weight: number; repetitions: number; setNumber: number },
  ) => Promise<void>;
  updateSet: (
    workoutId: string,
    setId: string,
    data: { weight?: number; repetitions?: number },
  ) => Promise<void>;
  deleteSet: (
    workoutId: string,
    itemId: string,
    setId: string,
  ) => Promise<void>;
  completeWorkout: (id: string, durationSeconds?: number) => Promise<void>;

  // Akcje - Plans
  createPlan: (data: { name: string; exerciseIds: string[]; isPublic: boolean }) => Promise<WorkoutPlan>;
  updatePlan: (id: string, data: { name?: string; exerciseIds?: string[]; isPublic?: boolean }) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  duplicatePlan: (id: string) => Promise<WorkoutPlan>;

  // Akcje - Plan integration
  skipPlanExercise: (workoutId: string, exerciseId: string) => Promise<void>;

  // Sync
  syncNow: () => Promise<void>;
  refreshWorkout: (id: string) => Promise<void>;
  resetLocalCache: () => Promise<void>;
  failedSyncOperations: SyncOperation[];
  dismissSyncFailures: () => void;
  getExerciseProgression: (
    exerciseId: string,
    metric?: StatsProgressMetric,
  ) => Promise<ExerciseProgression>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
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

  // Ref dla exercises - żeby callbacks nie zależały od exercises state
  const exercisesRef = useRef<Exercise[]>([]);
  exercisesRef.current = exercises;

  // Ref dla workouts - żeby getWorkout nie zależał od workouts state
  const workoutsRef = useRef<Workout[]>([]);
  workoutsRef.current = workouts;

  const statsRef = useRef<ExerciseStats[]>([]);
  statsRef.current = stats;

  const plansRef = useRef<WorkoutPlan[]>([]);
  plansRef.current = plans;

  // Mapowanie tymczasowych ID na prawdziwe - nie powoduje re-renderów
  const idMappingRef = useRef<Map<string, string>>(new Map());

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

  // Funkcja pomocnicza - pobierz prawdziwe ID (lub tymczasowe jeśli nie ma mapowania)
  const getRealId = (tempId: string): string => {
    return idMappingRef.current.get(tempId) || tempId;
  };

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
    [removePendingOperationsReferencingIds],
  );

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
  }, []);

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
  }, [user, fetchAllFromServer]);

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
  }, [user, invalidateProgressionCache, purgeLocalWorkout]);

  // === AKCJE ===

  const createWorkout = useCallback(
    async (data: {
      workoutName?: string;
      gymName?: string;
      workoutDate?: string;
      workoutPlanId?: string;
    }) => {
      try {
        const response = await authFetch(`${API_BASE}/api/workouts`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Błąd tworzenia treningu");

        const result = await response.json();
        const newWorkout = result.data;

        setWorkouts((prev) => [newWorkout, ...prev]);
        setActiveWorkoutId(newWorkout.id);
        await localStore.put("workouts", newWorkout);
        await localStore.setActiveWorkoutId(newWorkout.id);

        return newWorkout;
      } catch (error) {
        if (!isOfflineError(error)) throw error;

        const tempWorkoutId = `temp_workout_${Date.now()}`;
        const nowIso = new Date().toISOString();
        const tempWorkout: Workout = {
          id: tempWorkoutId,
          userId: user?.id || "offline-user",
          workoutDate: data.workoutDate || nowIso,
          status: "DRAFT",
          workoutName: data.workoutName || null,
          gymName: data.gymName || null,
          location: null,
          workoutNotes: null,
          workoutPlanId: data.workoutPlanId ?? null,
          skippedPlanExerciseIds: [],
          items: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        setWorkouts((prev) => [tempWorkout, ...prev]);
        setActiveWorkoutId(tempWorkoutId);
        await localStore.put("workouts", tempWorkout);
        await localStore.setActiveWorkoutId(tempWorkoutId);

        await queueSyncOperation({
          type: "create",
          entity: "workout",
          endpoint: "/api/workouts",
          method: "POST",
          data: {
            ...data,
            clientTempId: tempWorkoutId,
          },
        });

        return tempWorkout;
      }
    },
    [isOfflineError, queueSyncOperation, user?.id],
  );

  const updateWorkout = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const realWorkoutId = getRealId(id);

      try {
        if (realWorkoutId.startsWith("temp_")) {
          throw new TypeError("Temporary workout id cannot be synced yet");
        }

        const response = await authFetch(
          API_BASE + "/api/workouts/" + realWorkoutId,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          },
        );

        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }

        if (!response.ok) throw new Error("Błąd aktualizacji treningu");

        const result = await response.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
        await localStore.put("workouts", result.data);

        if (data.status === "COMPLETED") {
          setActiveWorkoutId((current) => (current === id ? null : current));
          const storedActiveWorkoutId = await localStore.getActiveWorkoutId();
          if (storedActiveWorkoutId === id || storedActiveWorkoutId === realWorkoutId) {
            await localStore.setActiveWorkoutId(null);
          }
        }
      } catch (error) {
        if (!isOfflineError(error)) throw error;

        let updatedWorkout: Workout | null = null;
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== id) return w;
            updatedWorkout = {
              ...w,
              ...data,
              updatedAt: new Date().toISOString(),
            } as Workout;
            return updatedWorkout;
          }),
        );

        if (updatedWorkout) {
          await localStore.put("workouts", updatedWorkout);
        }

        if (data.status === "COMPLETED") {
          setActiveWorkoutId((current) => (current === id ? null : current));
          await localStore.setActiveWorkoutId(null);
        }

        await queueSyncOperation({
          type: "update",
          entity: "workout",
          workoutId: realWorkoutId,
          endpoint: "/api/workouts/" + realWorkoutId,
          method: "PATCH",
          data,
        });
      }
    },
    [isOfflineError, purgeLocalWorkout, queueSyncOperation],
  );

  const deleteWorkout = useCallback(async (id: string) => {
    const realWorkoutId = getRealId(id);
    const workoutToDelete = workoutsRef.current.find((workout) => workout.id === id);
    let deletedOnServer = false;

    if (!realWorkoutId.startsWith("temp_")) {
      try {
        const response = await authFetch(
          API_BASE + "/api/workouts/" + realWorkoutId,
          {
            method: "DELETE",
          },
        );

        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          return;
        }

        if (!response.ok) throw new Error("Błąd usuwania treningu");
        deletedOnServer = true;
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        await queueSyncOperation({
          type: "delete",
          entity: "workout",
          workoutId: realWorkoutId,
          endpoint: "/api/workouts/" + realWorkoutId,
          method: "DELETE",
        });
      }
    }

    if (id.startsWith("temp_")) {
      const tempIdsToCleanup = new Set<string>([id]);
      workoutToDelete?.items.forEach((item) => {
        if (item.id.startsWith("temp_")) {
          tempIdsToCleanup.add(item.id);
        }
        item.sets.forEach((set) => {
          if (set.id.startsWith("temp_")) {
            tempIdsToCleanup.add(set.id);
          }
        });
      });

      await Promise.all(
        Array.from(tempIdsToCleanup).map((tempId) =>
          removePendingOperationsReferencingTempId(tempId),
        ),
      );
    }

    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    await localStore.delete("workouts", id);

    let removedActiveWorkout = false;
    setActiveWorkoutId((current) => {
      if (current !== id) return current;
      removedActiveWorkout = true;
      return null;
    });

    if (removedActiveWorkout) {
      await localStore.setActiveWorkoutId(null);
    }

    if (deletedOnServer) {
      await refreshStatsData();
      await invalidateProgressionCache();
    }
  }, [
    invalidateProgressionCache,
    isOfflineError,
    purgeLocalWorkout,
    queueSyncOperation,
    refreshStatsData,
    removePendingOperationsReferencingTempId,
  ]);

  const getWorkout = useCallback(
    (id: string) => workoutsRef.current.find((w) => w.id === id),
    [],
  );

  const createExercise = useCallback(
    async (data: {
      name: string;
      muscleGroups: string[];
      description?: string;
    }) => {
      try {
        const response = await authFetch(`${API_BASE}/api/exercises`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Błąd tworzenia ćwiczenia");

        const result = await response.json();
        const newExercise = result.data;

        setExercises((prev) => [newExercise, ...prev]);
        await localStore.put("exercises", newExercise);

        return newExercise;
      } catch (error) {
        if (!isOfflineError(error)) throw error;

        const tempExerciseId = `temp_exercise_${Date.now()}`;
        const tempExercise: Exercise = {
          id: tempExerciseId,
          name: data.name,
          muscleGroups: data.muscleGroups,
          description: data.description || undefined,
          photos: [],
          creator: {
            id: user?.id || "offline-user",
            firstName: user?.firstName || "Offline",
            lastName: user?.lastName || "User",
            email: user?.email || "offline@example.com",
          },
        };

        setExercises((prev) => [tempExercise, ...prev]);
        await localStore.put("exercises", tempExercise);

        await queueSyncOperation({
          type: "create",
          entity: "exercise",
          endpoint: "/api/exercises",
          method: "POST",
          data: {
            ...data,
            clientTempId: tempExerciseId,
          },
        });

        return tempExercise;
      }
    },
    [isOfflineError, queueSyncOperation, user?.email, user?.firstName, user?.id, user?.lastName],
  );

  const updateExercise = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const realExerciseId = getRealId(id);

      try {
        if (realExerciseId.startsWith("temp_")) {
          throw new TypeError("Temporary exercise id cannot be synced yet");
        }

        const response = await authFetch(
          API_BASE + "/api/exercises/" + realExerciseId,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) throw new Error("Błąd aktualizacji ćwiczenia");

        const result = await response.json();
        setExercises((prev) => prev.map((e) => (e.id === id ? result.data : e)));
        await localStore.put("exercises", result.data);
      } catch (error) {
        if (!isOfflineError(error)) throw error;

        let updatedExercise: Exercise | null = null;
        setExercises((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            updatedExercise = {
              ...e,
              ...data,
              updatedAt: new Date().toISOString(),
            } as Exercise;
            return updatedExercise;
          }),
        );
        if (updatedExercise) {
          await localStore.put("exercises", updatedExercise);
        }

        await queueSyncOperation({
          type: "update",
          entity: "exercise",
          endpoint: "/api/exercises/" + realExerciseId,
          method: "PATCH",
          data,
        });
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const deleteExercise = useCallback(async (id: string) => {
    const realExerciseId = getRealId(id);

    if (!realExerciseId.startsWith("temp_")) {
      try {
        const response = await authFetch(
          API_BASE + "/api/exercises/" + realExerciseId,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) throw new Error("Błąd usuwania ćwiczenia");
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        await queueSyncOperation({
          type: "delete",
          entity: "exercise",
          endpoint: "/api/exercises/" + realExerciseId,
          method: "DELETE",
        });
      }
    }

    if (id.startsWith("temp_")) {
      await removePendingOperationsReferencingTempId(id);
    }

    setExercises((prev) => prev.filter((e) => e.id !== id));
    await localStore.delete("exercises", id);
  }, [
    isOfflineError,
    queueSyncOperation,
    removePendingOperationsReferencingTempId,
  ]);

  // Odśwież pojedynczy workout
  const refreshWorkout = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`);
      if (response.status === 404) {
        await purgeLocalWorkout(id);
        return;
      }
      if (response.ok) {
        const result = await response.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
        await localStore.put("workouts", result.data);
      }
    } catch (error) {
      console.error("[DataProvider] Failed to refresh workout:", error);
    }
  }, [purgeLocalWorkout]);

  // Workout Items & Sets - OPTYMISTYCZNE AKTUALIZACJE
  const addExerciseToWorkout = useCallback(
    async (workoutId: string, exerciseId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const shouldRefreshStats =
        workoutsRef.current.find((workout) => workout.id === workoutId)?.status ===
        "COMPLETED";
      const tempItemId = `temp_item_${Date.now()}`;

      // Pobierz exercise z ref (nie z state - żeby nie tworzyć zależności)
      const exercise = exercisesRef.current.find((e) => e.id === exerciseId);
      if (!exercise) throw new Error("Nie znaleziono ćwiczenia");

      // Optymistyczna aktualizacja - dodaj od razu do UI, bez serii (pierwsza seria = draftSet w UI)
      const newItem = {
        id: tempItemId,
        workoutId,
        exerciseId,
        orderInWorkout: 0, // będzie obliczone w callback
        notes: null,
        previousNote: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercise: {
          id: exercise.id,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          description: exercise.description,
          photos: exercise.photos,
        },
        sets: [],
      };

      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          const itemWithOrder = {
            ...newItem,
            orderInWorkout: w.items.length + 1,
          };
          updatedWorkout = { ...w, items: [...w.items, itemWithOrder as WorkoutItem] };
          return updatedWorkout;
        }),
      );
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      const syncPayload = {
        exerciseId,
        clientTempItemId: tempItemId,
      };

      if (realWorkoutId.startsWith("temp_") || !navigator.onLine) {
        await queueSyncOperation({
          type: "create",
          entity: "workoutItem",
          workoutId: realWorkoutId,
          endpoint: `/api/workouts/${realWorkoutId}/exercises`,
          method: "POST",
          data: syncPayload,
        });
        return;
      }

      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/${realWorkoutId}/exercises`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ exerciseId }),
          },
        );
        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }
        if (!response.ok) throw new Error("Błąd dodawania ćwiczenia");
        const result = await response.json();

        if (result.data) {
          idMappingRef.current.set(tempItemId, result.data.id);

          let remappedWorkout: Workout | null = null;
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              remappedWorkout = {
                ...w,
                items: w.items.map((item) => {
                  if (item.id !== tempItemId) return item;
                  return {
                    ...item,
                    id: result.data.id,
                    previousNote: result.data.previousNote ?? null,
                  };
                }),
              };
              return remappedWorkout;
            }),
          );
          if (remappedWorkout) {
            await localStore.put("workouts", remappedWorkout);
          }
        }
        if (shouldRefreshStats) {
          await refreshStatsData();
          await invalidateProgressionCache(exerciseId);
        }
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          throw error;
        }

        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "create",
            entity: "workoutItem",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/${realWorkoutId}/exercises`,
            method: "POST",
            data: syncPayload,
          });
          return;
        }

        let rolledBackWorkout: Workout | null = null;
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            rolledBackWorkout = {
              ...w,
              items: w.items.filter((i) => i.id !== tempItemId),
            };
            return rolledBackWorkout;
          }),
        );
        if (rolledBackWorkout) {
          await localStore.put("workouts", rolledBackWorkout);
        }
      }
    },
    [invalidateProgressionCache, isOfflineError, purgeLocalWorkout, queueSyncOperation, refreshStatsData],
  );

  const removeExerciseFromWorkout = useCallback(
    async (workoutId: string, itemId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const originalWorkout = workoutsRef.current.find((workout) => workout.id === workoutId);
      const removedItem = originalWorkout?.items.find((item) => item.id === itemId);
      const shouldRefreshStats = originalWorkout?.status === "COMPLETED";
      // Zapisz oryginalny item do rollbacku
      let originalItem: WorkoutItem | null = null;

      // Optymistyczna aktualizacja
      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) => {
        // Znajdź oryginalny item przed usunięciem
        const workout = prev.find((w) => w.id === workoutId);
        if (workout) {
          originalItem = workout.items.find((i) => i.id === itemId) ?? null;
        }

        return prev.map((w) => {
          if (w.id !== workoutId) return w;
          updatedWorkout = { ...w, items: w.items.filter((i) => i.id !== itemId) };
          return updatedWorkout;
        });
      });
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      // Wyślij do serwera w tle - użyj prawdziwego ID jeśli mamy mapowanie
      const realItemId = getRealId(itemId);
      
      if (!realItemId.startsWith("temp_")) {
        if (!navigator.onLine) {
          await queueSyncOperation({
            type: "delete",
            entity: "workoutItem",
            workoutId: realWorkoutId,
            endpoint: "/api/workouts/items/" + realItemId,
            method: "DELETE",
          });
          return;
        }

        try {
          const response = await authFetch(
            API_BASE + "/api/workouts/items/" + realItemId,
            {
              method: "DELETE",
            },
          );
          if (response.status === 404) {
            await purgeLocalWorkout(realWorkoutId);
            alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
            throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
          }
          if (!response.ok) {
            throw new Error("Błąd usuwania ćwiczenia z treningu");
          }
        } catch (error) {
          if (error instanceof WorkoutNotFoundError) {
            throw error;
          }

          if (isOfflineError(error)) {
            await queueSyncOperation({
              type: "delete",
              entity: "workoutItem",
              workoutId: realWorkoutId,
              endpoint: "/api/workouts/items/" + realItemId,
              method: "DELETE",
            });
            return;
          }

          if (originalItem) {
            let restoredWorkout: Workout | null = null;
            setWorkouts((prev) =>
              prev.map((w) => {
                if (w.id !== workoutId) return w;
                restoredWorkout = {
                  ...w,
                  items: [...w.items, originalItem!].sort(
                    (a, b) => a.orderInWorkout - b.orderInWorkout,
                  ),
                };
                return restoredWorkout!;
              }),
            );
            if (restoredWorkout) {
              await localStore.put("workouts", restoredWorkout);
            }
          }
          throw error;
        }
      } else {
        await removePendingOperationsReferencingTempId(itemId);
        if (removedItem) {
          await Promise.all(
            removedItem.sets
              .filter((set) => set.id.startsWith("temp_"))
              .map((set) => removePendingOperationsReferencingTempId(set.id)),
          );
        }
      }
      // Jeśli ID tymczasowe - usunięcie jest tylko lokalne
      if (shouldRefreshStats) {
        await refreshStatsData();
        await invalidateProgressionCache(removedItem?.exerciseId);
      }
    },
    [
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      removePendingOperationsReferencingTempId,
    ],
  );

  const updateWorkoutItem = useCallback(
    async (workoutId: string, itemId: string, data: { notes?: string | null }) => {
      const realWorkoutId = getRealId(workoutId);
      const originalWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      const originalItem = originalWorkout?.items.find((i) => i.id === itemId);

      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          updatedWorkout = {
            ...w,
            items: w.items.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                notes: data.notes ?? null,
                updatedAt: new Date().toISOString(),
              };
            }),
          };
          return updatedWorkout;
        }),
      );
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      const realItemId = getRealId(itemId);
      if (realItemId.startsWith("temp_")) return;

      if (!navigator.onLine) {
        await queueSyncOperation({
          type: "update",
          entity: "workoutItem",
          workoutId: realWorkoutId,
          endpoint: `/api/workouts/items/${realItemId}`,
          method: "PATCH",
          data,
        });
        return;
      }

      try {
        const response = await authFetch(`${API_BASE}/api/workouts/items/${realItemId}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }

        if (!response.ok) {
          throw new Error("Błąd aktualizacji notatek ćwiczenia");
        }
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          throw error;
        }

        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "update",
            entity: "workoutItem",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/items/${realItemId}`,
            method: "PATCH",
            data,
          });
          return;
        }

        if (!originalItem) return;
        let restoredWorkout: Workout | null = null;
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            restoredWorkout = {
              ...w,
              items: w.items.map((item) => (item.id === itemId ? originalItem : item)),
            };
            return restoredWorkout;
          }),
        );
        if (restoredWorkout) {
          await localStore.put("workouts", restoredWorkout);
        }
      }
    },
    [isOfflineError, purgeLocalWorkout, queueSyncOperation],
  );

  const addSet = useCallback(
    async (
      workoutId: string,
      itemId: string,
      data: { weight: number; repetitions: number; setNumber: number },
    ) => {
      const realWorkoutId = getRealId(workoutId);
      const shouldRefreshStats =
        workoutsRef.current.find((workout) => workout.id === workoutId)?.status ===
        "COMPLETED";
      const exerciseId = workoutsRef.current
        .find((workout) => workout.id === workoutId)
        ?.items.find((item) => item.id === itemId)?.exerciseId;
      // Tymczasowe ID
      const tempSetId = `temp_set_${Date.now()}`;

      // Optymistyczna aktualizacja
      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          updatedWorkout = {
            ...w,
            items: w.items.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                sets: [
                  ...item.sets,
                  {
                    id: tempSetId,
                    itemId,
                    setNumber: data.setNumber,
                    weight: String(data.weight),
                    repetitions: data.repetitions,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              };
            }),
          };
          return updatedWorkout;
        }),
      );
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      // Wyślij do serwera w tle
      // Użyj prawdziwego ID jeśli mamy mapowanie, w przeciwnym razie sprawdź czy to temp
      const realItemId = getRealId(itemId);
      
      const syncPayload = {
        ...data,
        clientTempSetId: tempSetId,
      };

      if (realItemId.startsWith("temp_") || !navigator.onLine) {
        await queueSyncOperation({
          type: "create",
          entity: "set",
          workoutId: realWorkoutId,
          endpoint: `/api/workouts/items/${realItemId}/sets`,
          method: "POST",
          data: syncPayload,
        });
        return;
      }

      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/items/${realItemId}/sets`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          },
        );
        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }
        if (!response.ok) {
          await queueSyncOperation({
            type: "create",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/items/${realItemId}/sets`,
            method: "POST",
            data: syncPayload,
          });
          return;
        }
        const result = await response.json();
        if (result.data) {
          idMappingRef.current.set(tempSetId, result.data.id);
        }
        if (shouldRefreshStats) {
          await refreshStatsData();
          await invalidateProgressionCache(exerciseId);
        }
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          throw error;
        }

        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "create",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/items/${realItemId}/sets`,
            method: "POST",
            data: syncPayload,
          });
          return;
        }

        let rolledBackWorkout: Workout | null = null;
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            rolledBackWorkout = {
              ...w,
              items: w.items.map((item) => {
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  sets: item.sets.filter((s) => s.id !== tempSetId),
                };
              }),
            };
            return rolledBackWorkout;
          }),
        );
        if (rolledBackWorkout) {
          await localStore.put("workouts", rolledBackWorkout);
        }
      }
    },
    [invalidateProgressionCache, isOfflineError, purgeLocalWorkout, queueSyncOperation, refreshStatsData],
  );

  const updateSet = useCallback(
    async (
      workoutId: string,
      setId: string,
      data: { weight?: number; repetitions?: number },
    ) => {
      const realWorkoutId = getRealId(workoutId);
      const shouldRefreshStats =
        workoutsRef.current.find((workout) => workout.id === workoutId)?.status ===
        "COMPLETED";
      const exerciseId = workoutsRef.current
        .find((workout) => workout.id === workoutId)
        ?.items.find((item) => item.sets.some((set) => set.id === setId))?.exerciseId;
      let originalSet: WorkoutSet | null = null;

      // Optymistyczna aktualizacja - znajdź original w callback
      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) => {
        // Znajdź oryginał przed modyfikacją
        prev.forEach((w) => {
          w.items.forEach((item) => {
            const set = item.sets.find((s) => s.id === setId);
            if (set && !originalSet) originalSet = { ...set };
          });
        });

        return prev.map((w) => {
          if (w.id !== workoutId) return w;
          updatedWorkout = {
            ...w,
            items: w.items.map((item) => ({
              ...item,
              sets: item.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      weight:
                        data.weight !== undefined
                          ? String(data.weight)
                          : s.weight,
                      repetitions:
                        data.repetitions !== undefined
                          ? data.repetitions
                          : s.repetitions,
                    }
                  : s,
              ),
            })),
          };
          return updatedWorkout;
        });
      });
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      // Wyślij do serwera w tle - użyj prawdziwego ID jeśli mamy mapowanie
      const realSetId = getRealId(setId);
      
      if (realSetId.startsWith("temp_") || !navigator.onLine) {
        await queueSyncOperation({
          type: "update",
          entity: "set",
          workoutId: realWorkoutId,
          endpoint: `/api/workouts/sets/${realSetId}`,
          method: "PATCH",
          data,
        });
        return;
      }

      try {
        const response = await authFetch(`${API_BASE}/api/workouts/sets/${realSetId}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }
        if (!response.ok) {
          await queueSyncOperation({
            type: "update",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "PATCH",
            data,
          });
          return;
        }
        if (shouldRefreshStats) {
          await refreshStatsData();
          await invalidateProgressionCache(exerciseId);
        }
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          throw error;
        }

        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "update",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "PATCH",
            data,
          });
          return;
        }

        if (originalSet) {
          let restoredWorkout: Workout | null = null;
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              restoredWorkout = {
                ...w,
                items: w.items.map((item) => ({
                  ...item,
                  sets: item.sets.map((s) => (s.id === setId ? originalSet! : s)),
                })),
              };
              return restoredWorkout!;
            }),
          );
          if (restoredWorkout) {
            await localStore.put("workouts", restoredWorkout);
          }
        }
      }
    },
    [invalidateProgressionCache, isOfflineError, purgeLocalWorkout, queueSyncOperation, refreshStatsData],
  );

  const deleteSet = useCallback(
    async (workoutId: string, itemId: string, setId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const shouldRefreshStats =
        workoutsRef.current.find((workout) => workout.id === workoutId)?.status ===
        "COMPLETED";
      const exerciseId = workoutsRef.current
        .find((workout) => workout.id === workoutId)
        ?.items.find((item) => item.id === itemId)?.exerciseId;
      let originalSet: WorkoutSet | null = null;

      // Optymistyczna aktualizacja - znajdź original w callback
      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) => {
        // Znajdź oryginał przed modyfikacją
        prev.forEach((w) => {
          w.items.forEach((item) => {
            const set = item.sets.find((s) => s.id === setId);
            if (set && !originalSet) originalSet = { ...set };
          });
        });

        return prev.map((w) => {
          if (w.id !== workoutId) return w;
          updatedWorkout = {
            ...w,
            items: w.items.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                sets: item.sets.filter((s) => s.id !== setId),
              };
            }),
          };
          return updatedWorkout;
        });
      });
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      // Wyślij do serwera w tle - użyj prawdziwego ID jeśli mamy mapowanie
      const realSetId = getRealId(setId);
      
      if (realSetId.startsWith("temp_")) {
        await removePendingOperationsReferencingTempId(setId);
        return;
      }

      if (!navigator.onLine) {
        await queueSyncOperation({
          type: "delete",
          entity: "set",
          workoutId: realWorkoutId,
          endpoint: `/api/workouts/sets/${realSetId}`,
          method: "DELETE",
        });
        return;
      }

      try {
        const response = await authFetch(`${API_BASE}/api/workouts/sets/${realSetId}`, {
          method: "DELETE",
        });
        if (response.status === 404) {
          await purgeLocalWorkout(realWorkoutId);
          alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.");
          throw new WorkoutNotFoundError(`Workout ${realWorkoutId} no longer exists`);
        }
        if (!response.ok) {
          await queueSyncOperation({
            type: "delete",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "DELETE",
          });
          return;
        }
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          throw error;
        }

        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "delete",
            entity: "set",
            workoutId: realWorkoutId,
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "DELETE",
          });
          return;
        }

        if (originalSet) {
          let restoredWorkout: Workout | null = null;
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              restoredWorkout = {
                ...w,
                items: w.items.map((item) => {
                  if (item.id !== itemId) return item;
                  return {
                    ...item,
                    sets: [...item.sets, originalSet!].sort(
                      (a, b) => a.setNumber - b.setNumber,
                    ),
                  };
                }),
              };
              return restoredWorkout!;
            }),
          );
          if (restoredWorkout) {
            await localStore.put("workouts", restoredWorkout);
          }
        }
      }
      if (shouldRefreshStats) {
        await refreshStatsData();
        await invalidateProgressionCache(exerciseId);
      }
    },
    [
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      removePendingOperationsReferencingTempId,
    ],
  );

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

  const createPlan = useCallback(
    async (data: { name: string; exerciseIds: string[]; isPublic: boolean }): Promise<WorkoutPlan> => {
      if (!navigator.onLine) throw new Error("Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.");

      const response = await authFetch(`${API_BASE}/api/plans`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd tworzenia planu");
      }

      const result = await response.json();
      const newPlan: WorkoutPlan = result.data;

      setPlans((prev) => [newPlan, ...prev]);
      await localStore.put("plans", newPlan);

      return newPlan;
    },
    [],
  );

  const updatePlan = useCallback(
    async (id: string, data: { name?: string; exerciseIds?: string[]; isPublic?: boolean }) => {
      if (!navigator.onLine) throw new Error("Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.");

      const response = await authFetch(`${API_BASE}/api/plans/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd aktualizacji planu");
      }

      const result = await response.json();
      const updatedPlan: WorkoutPlan = result.data;

      setPlans((prev) => prev.map((p) => (p.id === id ? updatedPlan : p)));
      await localStore.put("plans", updatedPlan);
    },
    [],
  );

  const deletePlan = useCallback(async (id: string) => {
    if (!navigator.onLine) throw new Error("Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.");

    const response = await authFetch(`${API_BASE}/api/plans/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Błąd usuwania planu");

    setPlans((prev) => prev.filter((p) => p.id !== id));
    await localStore.delete("plans", id);
  }, []);

  const duplicatePlan = useCallback(async (id: string): Promise<WorkoutPlan> => {
    if (!navigator.onLine) throw new Error("Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.");

    const response = await authFetch(`${API_BASE}/api/plans/${id}/duplicate`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || "Błąd duplikacji planu");
    }

    const result = await response.json();
    const newPlan: WorkoutPlan = result.data;

    setPlans((prev) => [newPlan, ...prev]);
    await localStore.put("plans", newPlan);

    return newPlan;
  }, []);

  const skipPlanExercise = useCallback(async (workoutId: string, exerciseId: string) => {
    const realWorkoutId = getRealId(workoutId);

    let previousWorkout: Workout | null = null;
    let updatedWorkout: Workout | null = null;
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== workoutId) return w;
        const alreadySkipped = (w.skippedPlanExerciseIds ?? []).includes(exerciseId);
        if (alreadySkipped) return w;
        previousWorkout = w;
        updatedWorkout = {
          ...w,
          skippedPlanExerciseIds: [...(w.skippedPlanExerciseIds ?? []), exerciseId],
        };
        return updatedWorkout;
      }),
    );
    if (updatedWorkout) {
      await localStore.put("workouts", updatedWorkout);
    }

    if (!realWorkoutId.startsWith("temp_") && navigator.onLine) {
      try {
        await authFetch(`${API_BASE}/api/workouts/${realWorkoutId}/skip-plan-exercise`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ exerciseId }),
        });
      } catch {
        if (previousWorkout) {
          setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? previousWorkout! : w)));
          await localStore.put("workouts", previousWorkout);
        }
      }
    }
  }, []);

  const completeWorkout = useCallback(
    async (id: string, durationSeconds?: number) => {
      await updateWorkout(id, {
        status: "COMPLETED",
        ...(durationSeconds !== undefined && { durationSeconds }),
      });
      await refreshStatsData();
      await invalidateProgressionCache();
    },
    [invalidateProgressionCache, refreshStatsData, updateWorkout],
  );

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
  }, [fetchAllFromServer]);

  const dismissSyncFailures = useCallback(() => {
    setFailedSyncOperations([]);
  }, []);

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
      createWorkout,
      updateWorkout,
      deleteWorkout,
      getWorkout,
      createExercise,
      updateExercise,
      deleteExercise,
      addExerciseToWorkout,
      removeExerciseFromWorkout,
      updateWorkoutItem,
      addSet,
      updateSet,
      deleteSet,
      createPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      skipPlanExercise,
      completeWorkout,
      syncNow,
      refreshWorkout,
      resetLocalCache,
      getExerciseProgression,
      failedSyncOperations,
      dismissSyncFailures,
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
      createWorkout,
      updateWorkout,
      deleteWorkout,
      getWorkout,
      createExercise,
      updateExercise,
      deleteExercise,
      addExerciseToWorkout,
      removeExerciseFromWorkout,
      updateWorkoutItem,
      addSet,
      updateSet,
      deleteSet,
      createPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      skipPlanExercise,
      completeWorkout,
      syncNow,
      refreshWorkout,
      resetLocalCache,
      getExerciseProgression,
      failedSyncOperations,
      dismissSyncFailures,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

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
