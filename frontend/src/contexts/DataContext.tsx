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
import { syncManager } from "../utils/syncManager";
import { authFetch, getAuthHeaders } from "../utils/auth";
import { useAuth } from "./AuthContext";
import type {
  Workout,
  ExerciseStats,
  ExerciseProgression,
  StatsOverview,
  StatsProgressMetric,
} from "@/types";
import type { Exercise } from "@/hooks/useExercises";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface DataContextType {
  // Dane
  workouts: Workout[];
  exercises: Exercise[];
  stats: ExerciseStats[];
  statsOverview: StatsOverview | null;
  activeWorkoutId: string | null;

  // Stan
  isLoading: boolean;
  isOnline: boolean;
  lastSync: number;

  // Akcje - Workouts
  createWorkout: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate?: string;
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
  completeWorkout: (id: string) => Promise<void>;

  // Sync
  syncNow: () => Promise<void>;
  refreshWorkout: (id: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(0);

  const initialLoadDone = useRef(false);
  const progressionCacheRef = useRef<Map<string, ExerciseProgression>>(new Map());

  // Ref dla exercises - żeby callbacks nie zależały od exercises state
  const exercisesRef = useRef<Exercise[]>([]);
  exercisesRef.current = exercises;

  // Ref dla workouts - żeby getWorkout nie zależał od workouts state
  const workoutsRef = useRef<Workout[]>([]);
  workoutsRef.current = workouts;

  // Mapowanie tymczasowych ID na prawdziwe - nie powoduje re-renderów
  const idMappingRef = useRef<Map<string, string>>(new Map());

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
      endpoint: string;
      method: string;
      data?: unknown;
    }) => {
      await syncManager.queueOperation(operation);
    },
    [],
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

    try {
      const [workoutsRes, exercisesRes, activeRes, statsRes, overviewRes] =
        await Promise.all([
          authFetch(`${API_BASE}/api/workouts`).catch(() => null),
          authFetch(`${API_BASE}/api/exercises`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/active`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/stats/all`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/stats/overview`).catch(() => null),
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
        ] = await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
          localStore.getLastSync(),
        ]);

        setWorkouts(localWorkouts);
        setExercises(localExercises);
        setStats(localStats);
        setStatsOverview(localStatsOverview ?? null);
        setActiveWorkoutId(localActiveId);
        setLastSync(syncTime);

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
      // Po synchronizacji odśwież dane z lokalnego store
      const [
        localWorkouts,
        localExercises,
        localStats,
        localStatsOverview,
        localActiveId,
      ] =
        await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getMetadata<StatsOverview | null>("statsOverview"),
          localStore.getActiveWorkoutId(),
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
      // Nie wywołujemy setLastSync - powoduje niepotrzebny re-render
    });

    syncManager.start();

    return () => {
      unsubscribe();
      syncManager.stop();
    };
  }, [user]);

  // === AKCJE ===

  const createWorkout = useCallback(
    async (data: {
      workoutName?: string;
      gymName?: string;
      workoutDate?: string;
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
      try {
        const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Błąd aktualizacji treningu");

        const result = await response.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
        await localStore.put("workouts", result.data);
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
          setActiveWorkoutId(null);
          await localStore.setActiveWorkoutId(null);
        }

        await queueSyncOperation({
          type: "update",
          entity: "workout",
          endpoint: `/api/workouts/${id}`,
          method: "PATCH",
          data,
        });
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const deleteWorkout = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Błąd usuwania treningu");
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      await queueSyncOperation({
        type: "delete",
        entity: "workout",
        endpoint: `/api/workouts/${id}`,
        method: "DELETE",
      });
    }

    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    await localStore.delete("workouts", id);

    setActiveWorkoutId((current) => {
      if (current === id) {
        localStore.setActiveWorkoutId(null);
        return null;
      }
      return current;
    });
  }, [isOfflineError, queueSyncOperation]);

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
      try {
        const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

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
          endpoint: `/api/exercises/${id}`,
          method: "PATCH",
          data,
        });
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const deleteExercise = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Błąd usuwania ćwiczenia");
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      await queueSyncOperation({
        type: "delete",
        entity: "exercise",
        endpoint: `/api/exercises/${id}`,
        method: "DELETE",
      });
    }

    setExercises((prev) => prev.filter((e) => e.id !== id));
    await localStore.delete("exercises", id);
  }, [isOfflineError, queueSyncOperation]);

  // Odśwież pojedynczy workout
  const refreshWorkout = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`);
      if (response.ok) {
        const result = await response.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
        await localStore.put("workouts", result.data);
      }
    } catch (error) {
      console.error("[DataProvider] Failed to refresh workout:", error);
    }
  }, []);

  // Workout Items & Sets - OPTYMISTYCZNE AKTUALIZACJE
  const addExerciseToWorkout = useCallback(
    async (workoutId: string, exerciseId: string) => {
      // Tymczasowe ID dla optymistycznej aktualizacji
      const tempItemId = `temp_item_${Date.now()}`;
      const tempSetId = `temp_set_${Date.now()}`;

      // Pobierz exercise z ref (nie z state - żeby nie tworzyć zależności)
      const exercise = exercisesRef.current.find((e) => e.id === exerciseId);
      if (!exercise) throw new Error("Nie znaleziono ćwiczenia");

      // Optymistyczna aktualizacja - dodaj od razu do UI
      const newItem = {
        id: tempItemId,
        workoutId,
        exerciseId,
        orderInWorkout: 0, // będzie obliczone w callback
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercise: {
          id: exercise.id,
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
          description: exercise.description,
          photos: exercise.photos,
        },
        sets: [
          {
            id: tempSetId,
            itemId: tempItemId,
            setNumber: 1,
            weight: "0",
            repetitions: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          const itemWithOrder = {
            ...newItem,
            orderInWorkout: w.items.length + 1,
          };
          updatedWorkout = { ...w, items: [...w.items, itemWithOrder as any] };
          return updatedWorkout;
        }),
      );
      if (updatedWorkout) {
        await localStore.put("workouts", updatedWorkout);
      }

      const syncPayload = {
        exerciseId,
        clientTempItemId: tempItemId,
        clientTempSetId: tempSetId,
      };

      if (!navigator.onLine) {
        await queueSyncOperation({
          type: "create",
          entity: "workoutItem",
          endpoint: `/api/workouts/${workoutId}/exercises`,
          method: "POST",
          data: syncPayload,
        });
        return;
      }

      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/${workoutId}/exercises`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ exerciseId }),
          },
        );
        if (!response.ok) throw new Error("Błąd dodawania ćwiczenia");
        const result = await response.json();

        if (result.data) {
          idMappingRef.current.set(tempItemId, result.data.id);
          const serverSets = result.data.sets || [];
          if (serverSets[0]) {
            idMappingRef.current.set(tempSetId, serverSets[0].id);
          }

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
                    sets: item.sets.map((set, index) =>
                      index === 0 && serverSets[0]
                        ? {
                            ...set,
                            id: serverSets[0].id,
                            repetitions: serverSets[0].repetitions,
                          }
                        : set,
                    ),
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
      } catch (error) {
        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "create",
            entity: "workoutItem",
            endpoint: `/api/workouts/${workoutId}/exercises`,
            method: "POST",
            data: syncPayload,
          });
          return;
        }

        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            return {
              ...w,
              items: w.items.filter((i) => i.id !== tempItemId),
            };
          }),
        );
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const removeExerciseFromWorkout = useCallback(
    async (workoutId: string, itemId: string) => {
      // Zapisz oryginalny item do rollbacku
      let originalItem: any = null;

      // Optymistyczna aktualizacja
      let updatedWorkout: Workout | null = null;
      setWorkouts((prev) => {
        // Znajdź oryginalny item przed usunięciem
        const workout = prev.find((w) => w.id === workoutId);
        if (workout) {
          originalItem = workout.items.find((i) => i.id === itemId);
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
      
      if (!realItemId.startsWith('temp_')) {
        if (!navigator.onLine) {
          await queueSyncOperation({
            type: "delete",
            entity: "workoutItem",
            endpoint: `/api/workouts/items/${realItemId}`,
            method: "DELETE",
          });
          return;
        }

        try {
          await authFetch(`${API_BASE}/api/workouts/items/${realItemId}`, {
            method: "DELETE",
          });
        } catch (error) {
          if (isOfflineError(error)) {
            await queueSyncOperation({
              type: "delete",
              entity: "workoutItem",
              endpoint: `/api/workouts/items/${realItemId}`,
              method: "DELETE",
            });
            return;
          }

          if (originalItem) {
            setWorkouts((prev) =>
              prev.map((w) => {
                if (w.id !== workoutId) return w;
                return {
                  ...w,
                  items: [...w.items, originalItem].sort(
                    (a, b) => a.orderInWorkout - b.orderInWorkout,
                  ),
                };
              }),
            );
          }
        }
      }
      // Jeśli ID tymczasowe - usunięcie jest tylko lokalne
    },
    [isOfflineError, queueSyncOperation],
  );

  const updateWorkoutItem = useCallback(
    async (workoutId: string, itemId: string, data: { notes?: string | null }) => {
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

        if (!response.ok) {
          throw new Error("Błąd aktualizacji notatek ćwiczenia");
        }
      } catch (error) {
        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "update",
            entity: "workoutItem",
            endpoint: `/api/workouts/items/${realItemId}`,
            method: "PATCH",
            data,
          });
          return;
        }

        if (!originalItem) return;
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            return {
              ...w,
              items: w.items.map((item) => (item.id === itemId ? originalItem : item)),
            };
          }),
        );
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const addSet = useCallback(
    async (
      workoutId: string,
      itemId: string,
      data: { weight: number; repetitions: number; setNumber: number },
    ) => {
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
        if (!response.ok) {
          await queueSyncOperation({
            type: "create",
            entity: "set",
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
      } catch (error) {
        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "create",
            entity: "set",
            endpoint: `/api/workouts/items/${realItemId}/sets`,
            method: "POST",
            data: syncPayload,
          });
          return;
        }

        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            return {
              ...w,
              items: w.items.map((item) => {
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  sets: item.sets.filter((s) => s.id !== tempSetId),
                };
              }),
            };
          }),
        );
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const updateSet = useCallback(
    async (
      workoutId: string,
      setId: string,
      data: { weight?: number; repetitions?: number },
    ) => {
      // Zapisz oryginalne wartości do rollbacku (używamy ref do przechowania)
      let originalSet: any = null;

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
        if (!response.ok) {
          await queueSyncOperation({
            type: "update",
            entity: "set",
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "PATCH",
            data,
          });
          return;
        }
      } catch (error) {
        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "update",
            entity: "set",
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "PATCH",
            data,
          });
          return;
        }

        if (originalSet) {
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              return {
                ...w,
                items: w.items.map((item) => ({
                  ...item,
                  sets: item.sets.map((s) => (s.id === setId ? originalSet : s)),
                })),
              };
            }),
          );
        }
      }
    },
    [isOfflineError, queueSyncOperation],
  );

  const deleteSet = useCallback(
    async (workoutId: string, itemId: string, setId: string) => {
      // Zapisz oryginalną serię do rollbacku (w callback)
      let originalSet: any = null;

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
        return;
      }

      if (!navigator.onLine) {
        await queueSyncOperation({
          type: "delete",
          entity: "set",
          endpoint: `/api/workouts/sets/${realSetId}`,
          method: "DELETE",
        });
        return;
      }

      try {
        const response = await authFetch(`${API_BASE}/api/workouts/sets/${realSetId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          await queueSyncOperation({
            type: "delete",
            entity: "set",
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "DELETE",
          });
          return;
        }
      } catch (error) {
        if (isOfflineError(error)) {
          await queueSyncOperation({
            type: "delete",
            entity: "set",
            endpoint: `/api/workouts/sets/${realSetId}`,
            method: "DELETE",
          });
          return;
        }

        if (originalSet) {
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              return {
                ...w,
                items: w.items.map((item) => {
                  if (item.id !== itemId) return item;
                  return {
                    ...item,
                    sets: [...item.sets, originalSet].sort(
                      (a, b) => a.setNumber - b.setNumber,
                    ),
                  };
                }),
              };
            }),
          );
        }
      }
    },
    [isOfflineError, queueSyncOperation],
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
      const localCached = await localStore.getMetadata<ExerciseProgression | null>(
        metadataKey,
      );
      if (localCached) {
        progressionCacheRef.current.set(cacheKey, localCached);
        return localCached;
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

  const completeWorkout = useCallback(
    async (id: string) => {
      await updateWorkout(id, { status: "COMPLETED" });

      if (!navigator.onLine) return;

      try {
        const statsRes = await authFetch(`${API_BASE}/api/workouts/stats/all`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.data || []);
          await localStore.clear("stats");
          await localStore.putMany("stats", data.data || []);
        }

        const overviewRes = await authFetch(
          `${API_BASE}/api/workouts/stats/overview`,
        );
        if (overviewRes.ok) {
          const data = await overviewRes.json();
          setStatsOverview(data.data || null);
          await localStore.setMetadata("statsOverview", data.data || null);
        }
        progressionCacheRef.current.clear();
      } catch (error) {
        console.error("[DataProvider] Failed to refresh stats:", error);
      }
    },
    [updateWorkout],
  );

  const syncNow = useCallback(async () => {
    await syncManager.syncNow();
  }, []);

  const value: DataContextType = useMemo(
    () => ({
      workouts,
      exercises,
      stats,
      statsOverview,
      activeWorkoutId,
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
      completeWorkout,
      syncNow,
      refreshWorkout,
      getExerciseProgression,
    }),
    [
      workouts,
      exercises,
      stats,
      statsOverview,
      activeWorkoutId,
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
      completeWorkout,
      syncNow,
      refreshWorkout,
      getExerciseProgression,
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
      completeWorkout: () => completeWorkout(id),
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
    isLoading,
    syncNow,
    getExerciseProgression,
  } = useData();
  return {
    stats,
    overview: statsOverview,
    loading: isLoading,
    error: null,
    refetch: syncNow,
    getExerciseProgression,
  };
}
