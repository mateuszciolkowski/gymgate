import { useState, useEffect, useCallback } from "react";
import { authFetch, getAuthHeaders } from "../utils/auth";
import type {
  Workout,
  CreateWorkoutDto,
  UpdateWorkoutDto,
  AddExerciseToWorkoutDto,
  CreateWorkoutSetDto,
  UpdateWorkoutSetDto,
  ExerciseStats,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useWorkouts(status?: "DRAFT" | "COMPLETED", autoFetch = true) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      const response = await authFetch(`${API_BASE}/api/workouts?${params}`);
      if (!response.ok) throw new Error("Błąd ładowania treningów");

      const data = await response.json();
      setWorkouts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (autoFetch) {
      fetchWorkouts();
    }
  }, [fetchWorkouts, autoFetch]);

  const createWorkout = useCallback(async (data: CreateWorkoutDto) => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Błąd tworzenia treningu");

      const result = await response.json();
      setWorkouts((prev) => [result.data, ...prev]);
      return result.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateWorkout = useCallback(
    async (id: string, data: UpdateWorkoutDto) => {
      try {
        const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Błąd aktualizacji treningu");

        const result = await response.json();
        setWorkouts((prev) => prev.map((w) => (w.id === id ? result.data : w)));
        return result.data;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const deleteWorkout = useCallback(async (id: string) => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Błąd usuwania treningu");

      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    workouts,
    loading,
    error,
    refetch: fetchWorkouts,
    createWorkout,
    updateWorkout,
    deleteWorkout,
  };
}

export function useWorkout(id: string) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`);
      if (!response.ok) throw new Error("Błąd ładowania treningu");

      const data = await response.json();
      setWorkout(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchWorkout();
  }, [id, fetchWorkout]);

  const addExercise = useCallback(
    async (data: AddExerciseToWorkoutDto) => {
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/${id}/exercises`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (!response.ok) throw new Error("Błąd dodawania ćwiczenia");

        const result = await response.json();
        await fetchWorkout(); // Refresh full workout
        return result.data;
      } catch (err) {
        throw err;
      }
    },
    [id, fetchWorkout]
  );

  const addSet = useCallback(
    async (itemId: string, data: CreateWorkoutSetDto) => {
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/items/${itemId}/sets`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (!response.ok) throw new Error("Błąd dodawania serii");

        const result = await response.json();
        await fetchWorkout(); // Refresh full workout
        return result.data;
      } catch (err) {
        throw err;
      }
    },
    [fetchWorkout]
  );

  const updateSet = useCallback(
    async (setId: string, data: UpdateWorkoutSetDto) => {
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/sets/${setId}`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (!response.ok) throw new Error("Błąd aktualizacji serii");

        await fetchWorkout(); // Refresh full workout
      } catch (err) {
        throw err;
      }
    },
    [fetchWorkout]
  );

  const deleteSet = useCallback(
    async (setId: string) => {
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/sets/${setId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Błąd usuwania serii");

        await fetchWorkout(); // Refresh full workout
      } catch (err) {
        throw err;
      }
    },
    [fetchWorkout]
  );

  const deleteExercise = useCallback(
    async (itemId: string) => {
      try {
        const response = await authFetch(
          `${API_BASE}/api/workouts/items/${itemId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Błąd usuwania ćwiczenia");

        await fetchWorkout(); // Refresh full workout
      } catch (err) {
        throw err;
      }
    },
    [fetchWorkout]
  );

  const completeWorkout = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!response.ok) throw new Error("Błąd kończenia treningu");

      const result = await response.json();
      setWorkout(result.data);
      return result.data;
    } catch (err) {
      throw err;
    }
  }, [id]);

  const updateWorkout = useCallback(
    async (data: UpdateWorkoutDto) => {
      try {
        const response = await authFetch(`${API_BASE}/api/workouts/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Błąd aktualizacji treningu");

        const result = await response.json();
        setWorkout(result.data);
        return result.data;
      } catch (err) {
        throw err;
      }
    },
    [id]
  );

  return {
    workout,
    loading,
    error,
    refetch: fetchWorkout,
    addExercise,
    addSet,
    updateSet,
    deleteSet,
    deleteExercise,
    completeWorkout,
    updateWorkout,
  };
}

export function useExerciseStats(exerciseId?: string) {
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (exId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(
        `${API_BASE}/api/workouts/stats/exercise/${exId}`
      );
      if (!response.ok) throw new Error("Błąd ładowania statystyk");

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (exerciseId) fetchStats(exerciseId);
  }, [exerciseId, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
}

// Simple cache for stats to prevent duplicate fetches
let statsCache: { data: ExerciseStats[]; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export function useAllUserStats() {
  const [stats, setStats] = useState<ExerciseStats[]>(statsCache?.data || []);
  const [loading, setLoading] = useState(!statsCache);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`${API_BASE}/api/workouts/stats/all`);
      if (!response.ok) throw new Error("Błąd ładowania statystyk");

      const data = await response.json();
      const newStats = data.data || [];
      
      // Update cache
      statsCache = { data: newStats, timestamp: Date.now() };
      setStats(newStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: () => fetchStats(true), // Force refetch
  };
}

// Simple cache for active workout
let activeWorkoutCache: { id: string | null; timestamp: number } | null = null;
const ACTIVE_CACHE_TTL = 10000; // 10 seconds

export function useActiveWorkout() {
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(
    activeWorkoutCache?.id ?? null
  );
  const [loading, setLoading] = useState(!activeWorkoutCache);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveWorkout = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && activeWorkoutCache && Date.now() - activeWorkoutCache.timestamp < ACTIVE_CACHE_TTL) {
      setActiveWorkoutId(activeWorkoutCache.id);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(`${API_BASE}/api/workouts/active`);
      if (!response.ok) throw new Error("Błąd ładowania aktywnego treningu");

      const data = await response.json();
      const id = data.data.activeWorkoutId;
      
      // Update cache
      activeWorkoutCache = { id, timestamp: Date.now() };
      setActiveWorkoutId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearActiveWorkout = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/workouts/active`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Błąd czyszczenia aktywnego treningu");
      
      // Clear cache
      activeWorkoutCache = { id: null, timestamp: Date.now() };
      setActiveWorkoutId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchActiveWorkout();
  }, [fetchActiveWorkout]);

  return {
    activeWorkoutId,
    loading,
    error,
    refetch: () => fetchActiveWorkout(true),
    clearActiveWorkout,
  };
}
