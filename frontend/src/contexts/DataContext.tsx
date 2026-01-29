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
} from "react";
import { localStore } from "../utils/localStore";
import { syncManager } from "../utils/syncManager";
import { authFetch, getAuthHeaders } from "../utils/auth";
import { useAuth } from "./AuthContext";
import type { Workout, ExerciseStats } from "@/types";
import type { Exercise } from "@/hooks/useExercises";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface DataContextType {
  // Dane
  workouts: Workout[];
  exercises: Exercise[];
  stats: ExerciseStats[];
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
    exerciseId: string
  ) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: string, itemId: string) => Promise<void>;
  addSet: (
    workoutId: string,
    itemId: string,
    data: { weight: number; repetitions: number; setNumber: number }
  ) => Promise<void>;
  updateSet: (
    workoutId: string,
    setId: string,
    data: { weight?: number; repetitions?: number }
  ) => Promise<void>;
  deleteSet: (workoutId: string, itemId: string, setId: string) => Promise<void>;
  completeWorkout: (id: string) => Promise<void>;

  // Sync
  syncNow: () => Promise<void>;
  refreshWorkout: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Stan
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(0);

  const initialLoadDone = useRef(false);

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
      const [workoutsRes, exercisesRes, activeRes, statsRes] = await Promise.all([
        authFetch(`${API_BASE}/api/workouts`).catch(() => null),
        authFetch(`${API_BASE}/api/exercises`).catch(() => null),
        authFetch(`${API_BASE}/api/workouts/active`).catch(() => null),
        authFetch(`${API_BASE}/api/workouts/stats/all`).catch(() => null),
      ]);

      if (workoutsRes?.ok) {
        const data = await workoutsRes.json();
        const newWorkouts = data.data || [];
        setWorkouts(newWorkouts);
        await localStore.clear("workouts");
        await localStore.putMany("workouts", newWorkouts);
      }

      if (exercisesRes?.ok) {
        const data = await exercisesRes.json();
        const newExercises = data.data || [];
        setExercises(newExercises);
        await localStore.clear("exercises");
        await localStore.putMany("exercises", newExercises);
      }

      if (activeRes?.ok) {
        const data = await activeRes.json();
        const id = data.data?.activeWorkoutId || null;
        setActiveWorkoutId(id);
        await localStore.setActiveWorkoutId(id);
      }

      if (statsRes?.ok) {
        const data = await statsRes.json();
        const newStats = data.data || [];
        setStats(newStats);
        await localStore.clear("stats");
        await localStore.putMany("stats", newStats);
      }

      await localStore.setLastSync(Date.now());
      setLastSync(Date.now());
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
        const [localWorkouts, localExercises, localStats, localActiveId, syncTime] =
          await Promise.all([
            localStore.getAll<Workout>("workouts"),
            localStore.getAll<Exercise>("exercises"),
            localStore.getAll<ExerciseStats>("stats"),
            localStore.getActiveWorkoutId(),
            localStore.getLastSync(),
          ]);

        setWorkouts(localWorkouts);
        setExercises(localExercises);
        setStats(localStats);
        setActiveWorkoutId(localActiveId);
        setLastSync(syncTime);

        initialLoadDone.current = true;

        // Jeśli dane są stale (> 5 min) lub puste, pobierz świeże
        const isStale = Date.now() - syncTime > 5 * 60 * 1000;
        const isEmpty = localWorkouts.length === 0 && localExercises.length === 0;

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
      const [localWorkouts, localExercises, localStats, localActiveId] =
        await Promise.all([
          localStore.getAll<Workout>("workouts"),
          localStore.getAll<Exercise>("exercises"),
          localStore.getAll<ExerciseStats>("stats"),
          localStore.getActiveWorkoutId(),
        ]);

      setWorkouts(localWorkouts);
      setExercises(localExercises);
      setStats(localStats);
      setActiveWorkoutId(localActiveId);
      setLastSync(Date.now());
    });

    syncManager.start();

    return () => {
      unsubscribe();
      syncManager.stop();
    };
  }, [user]);

  // === AKCJE ===

  const createWorkout = useCallback(
    async (data: { workoutName?: string; gymName?: string; workoutDate?: string }) => {
      const response = await authFetch(`${API_BASE}/api/workouts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Błąd tworzenia treningu");

      const result = await response.json();
      const newWorkout = result.data;

      // Aktualizuj stan i lokalne dane
      setWorkouts((prev) => [newWorkout, ...prev]);
      setActiveWorkoutId(newWorkout.id);
      await localStore.put("workouts", newWorkout);
      await localStore.setActiveWorkoutId(newWorkout.id);

      return newWorkout;
    },
    []
  );

  const updateWorkout = useCallback(async (id: string, data: Record<string, unknown>) => {
    const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Błąd aktualizacji treningu");

    const result = await response.json();
    setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
    await localStore.put("workouts", result.data);
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Błąd usuwania treningu");

    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    await localStore.delete("workouts", id);
  }, []);

  const getWorkout = useCallback(
    (id: string) => workouts.find((w) => w.id === id),
    [workouts]
  );

  const createExercise = useCallback(
    async (data: { name: string; muscleGroups: string[]; description?: string }) => {
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
    },
    []
  );

  const updateExercise = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Błąd aktualizacji ćwiczenia");

      const result = await response.json();
      setExercises((prev) => prev.map((e) => (e.id === id ? result.data : e)));
      await localStore.put("exercises", result.data);
    },
    []
  );

  const deleteExercise = useCallback(async (id: string) => {
    const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Błąd usuwania ćwiczenia");

    setExercises((prev) => prev.filter((e) => e.id !== id));
    await localStore.delete("exercises", id);
  }, []);

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
      // Znajdź ćwiczenie
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) throw new Error("Nie znaleziono ćwiczenia");

      // Znajdź workout
      const workout = workouts.find((w) => w.id === workoutId);
      if (!workout) throw new Error("Nie znaleziono treningu");

      // Tymczasowe ID dla optymistycznej aktualizacji
      const tempItemId = `temp_item_${Date.now()}`;
      const tempSetId = `temp_set_${Date.now()}`;

      // Optymistyczna aktualizacja - dodaj od razu do UI
      const newItem = {
        id: tempItemId,
        workoutId,
        exerciseId,
        orderInWorkout: workout.items.length + 1,
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
        sets: [{
          id: tempSetId,
          itemId: tempItemId,
          setNumber: 1,
          weight: "0",
          repetitions: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      };

      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          return { ...w, items: [...w.items, newItem as any] };
        })
      );

      // Wyślij do serwera w tle
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/${workoutId}/exercises`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ exerciseId }),
          }
        );

        if (!response.ok) throw new Error("Błąd dodawania ćwiczenia");

        // Odśwież z serwera żeby mieć prawdziwe ID
        await refreshWorkout(workoutId);
      } catch (error) {
        // Rollback przy błędzie
        setWorkouts((prev) =>
          prev.map((w) => {
            if (w.id !== workoutId) return w;
            return { ...w, items: w.items.filter((i) => i.id !== tempItemId) };
          })
        );
        throw error;
      }
    },
    [exercises, workouts, refreshWorkout]
  );

  const removeExerciseFromWorkout = useCallback(
    async (workoutId: string, itemId: string) => {
      // Optymistyczna aktualizacja
      const originalWorkouts = [...workouts];
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          return { ...w, items: w.items.filter((i) => i.id !== itemId) };
        })
      );

      try {
        const response = await authFetch(`${API_BASE}/api/workouts/items/${itemId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Błąd usuwania ćwiczenia");
      } catch (error) {
        // Rollback
        setWorkouts(originalWorkouts);
        throw error;
      }
    },
    [workouts]
  );

  const addSet = useCallback(
    async (
      workoutId: string,
      itemId: string,
      data: { weight: number; repetitions: number; setNumber: number }
    ) => {
      // Tymczasowe ID
      const tempSetId = `temp_set_${Date.now()}`;

      // Optymistyczna aktualizacja
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          return {
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
        })
      );

      // Wyślij do serwera w tle (bez await - fire and forget)
      authFetch(`${API_BASE}/api/workouts/items/${itemId}/sets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          // Zamień tymczasowe ID na prawdziwe
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              return {
                ...w,
                items: w.items.map((item) => {
                  if (item.id !== itemId) return item;
                  return {
                    ...item,
                    sets: item.sets.map((s) =>
                      s.id === tempSetId ? result.data : s
                    ),
                  };
                }),
              };
            })
          );
        }
      }).catch(() => {
        // Rollback przy błędzie
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
          })
        );
      });
    },
    []
  );

  const updateSet = useCallback(
    async (
      workoutId: string,
      setId: string,
      data: { weight?: number; repetitions?: number }
    ) => {
      // Zapisz oryginalne wartości do rollbacku
      let originalSet: any = null;
      workouts.forEach((w) => {
        w.items.forEach((item) => {
          const set = item.sets.find((s) => s.id === setId);
          if (set) originalSet = { ...set };
        });
      });

      // Optymistyczna aktualizacja
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          return {
            ...w,
            items: w.items.map((item) => ({
              ...item,
              sets: item.sets.map((s) =>
                s.id === setId
                  ? {
                      ...s,
                      weight: data.weight !== undefined ? String(data.weight) : s.weight,
                      repetitions: data.repetitions !== undefined ? data.repetitions : s.repetitions,
                    }
                  : s
              ),
            })),
          };
        })
      );

      // Wyślij do serwera w tle
      authFetch(`${API_BASE}/api/workouts/sets/${setId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).catch(() => {
        // Rollback przy błędzie
        if (originalSet) {
          setWorkouts((prev) =>
            prev.map((w) => {
              if (w.id !== workoutId) return w;
              return {
                ...w,
                items: w.items.map((item) => ({
                  ...item,
                  sets: item.sets.map((s) =>
                    s.id === setId ? originalSet : s
                  ),
                })),
              };
            })
          );
        }
      });
    },
    [workouts]
  );

  const deleteSet = useCallback(
    async (workoutId: string, itemId: string, setId: string) => {
      // Zapisz oryginalną serię do rollbacku
      let originalSet: any = null;
      workouts.forEach((w) => {
        w.items.forEach((item) => {
          const set = item.sets.find((s) => s.id === setId);
          if (set) originalSet = { ...set };
        });
      });

      // Optymistyczna aktualizacja
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w;
          return {
            ...w,
            items: w.items.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                sets: item.sets.filter((s) => s.id !== setId),
              };
            }),
          };
        })
      );

      // Wyślij do serwera w tle
      authFetch(`${API_BASE}/api/workouts/sets/${setId}`, {
        method: "DELETE",
      }).catch(() => {
        // Rollback przy błędzie
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
                      (a, b) => a.setNumber - b.setNumber
                    ),
                  };
                }),
              };
            })
          );
        }
      });
    },
    [workouts]
  );

  const completeWorkout = useCallback(async (id: string) => {
    const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: "COMPLETED" }),
    });

    if (!response.ok) throw new Error("Błąd kończenia treningu");

    const result = await response.json();
    setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
    setActiveWorkoutId(null);
    await localStore.put("workouts", result.data);
    await localStore.setActiveWorkoutId(null);

    // Odśwież statystyki
    try {
      const statsRes = await authFetch(`${API_BASE}/api/workouts/stats/all`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || []);
        await localStore.clear("stats");
        await localStore.putMany("stats", data.data || []);
      }
    } catch (error) {
      console.error("[DataProvider] Failed to refresh stats:", error);
    }
  }, []);

  const syncNow = useCallback(async () => {
    await syncManager.syncNow();
  }, []);

  const value: DataContextType = {
    workouts,
    exercises,
    stats,
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
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    syncNow,
    refreshWorkout,
  };

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
  const { workouts, isLoading, createWorkout, updateWorkout, deleteWorkout, syncNow } =
    useData();
  return {
    workouts,
    loading: isLoading,
    error: null,
    createWorkout,
    updateWorkout: (id: string, data: Record<string, unknown>) => updateWorkout(id, data),
    deleteWorkout,
    refetch: syncNow,
  };
}

export function useExercisesData() {
  const { exercises, isLoading, createExercise, updateExercise, deleteExercise, syncNow } =
    useData();
  return {
    exercises,
    loading: isLoading,
    error: null,
    addExercise: createExercise,
    updateExercise: (id: string, data: Record<string, unknown>) => updateExercise(id, data),
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
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    updateWorkout,
    refreshWorkout,
    isLoading,
  } = useData();

  const workout = getWorkout(id);

  return {
    workout: workout || null,
    loading: isLoading && !workout,
    error: null,
    refetch: () => refreshWorkout(id),
    addExercise: (data: { exerciseId: string }) =>
      addExerciseToWorkout(id, data.exerciseId),
    addSet: (itemId: string, data: { weight: number; repetitions: number; setNumber: number }) =>
      addSet(id, itemId, data),
    updateSet: (setId: string, data: { weight?: number; repetitions?: number }) =>
      updateSet(id, setId, data),
    deleteSet: (itemId: string, setId: string) => deleteSet(id, itemId, setId),
    deleteExercise: (itemId: string) => removeExerciseFromWorkout(id, itemId),
    completeWorkout: () => completeWorkout(id),
    updateWorkout: (data: Record<string, unknown>) => updateWorkout(id, data),
  };
}

export function useStatsData() {
  const { stats, isLoading, syncNow } = useData();
  return {
    stats,
    loading: isLoading,
    error: null,
    refetch: syncNow,
  };
}
