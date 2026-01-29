import { useState, useEffect, useCallback } from "react";
import { authFetch, getAuthHeaders } from "../utils/auth";

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  description?: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos?: Array<{
    id: string;
    photoStage: string;
    photoUrl: string;
  }>;
}

interface ExerciseFilters {
  muscleGroup?: string;
  name?: string;
}

// Cache for exercises - keyed by filter string
const exercisesCache: Map<string, { data: Exercise[]; timestamp: number }> =
  new Map();
const EXERCISES_CACHE_TTL = 60000; // 60 seconds

export function useExercises(filters?: ExerciseFilters, autoFetch = true) {
  const cacheKey = `${filters?.muscleGroup || ""}-${filters?.name || ""}`;
  const cachedData = exercisesCache.get(cacheKey);

  const [exercises, setExercises] = useState<Exercise[]>(
    cachedData?.data || [],
  );
  const [loading, setLoading] = useState(autoFetch && !cachedData);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const muscleGroup = filters?.muscleGroup;
  const name = filters?.name;

  const fetchExercises = useCallback(
    async (force = false) => {
      // Check cache first
      const cached = exercisesCache.get(cacheKey);
      if (
        !force &&
        cached &&
        Date.now() - cached.timestamp < EXERCISES_CACHE_TTL
      ) {
        setExercises(cached.data);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (muscleGroup) params.append("muscleGroup", muscleGroup);
        if (name) params.append("name", name);

        const url = `${API_BASE}/api/exercises${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        const response = await authFetch(url);
        if (!response.ok) throw new Error("Błąd ładowania ćwiczeń");
        const data = await response.json();
        const newExercises = data.data || [];

        // Update cache
        exercisesCache.set(cacheKey, {
          data: newExercises,
          timestamp: Date.now(),
        });
        setExercises(newExercises);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, muscleGroup, name, cacheKey],
  );

  useEffect(() => {
    if (autoFetch) {
      fetchExercises();
    }
  }, [fetchExercises, autoFetch]);

  const addExercise = useCallback(
    async (
      exerciseData: Omit<Exercise, "id" | "creator" | "photos"> & {
        muscleGroups: string[];
      },
    ) => {
      try {
        setError(null);
        const response = await authFetch(`${API_BASE}/api/exercises`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: exerciseData.name,
            muscleGroups: exerciseData.muscleGroups,
            description: exerciseData.description || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Błąd dodawania ćwiczenia");
        }

        const newExercise = await response.json();
        // Clear all cache entries (new exercise may appear in multiple filters)
        exercisesCache.clear();
        setExercises((prev) => [newExercise.data, ...prev]);
        return newExercise.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
        throw err;
      }
    },
    [API_BASE],
  );

  const updateExercise = useCallback(
    async (
      id: string,
      exerciseData: {
        name?: string;
        muscleGroups?: string[];
        description?: string;
      },
    ) => {
      try {
        setError(null);
        const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(exerciseData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Błąd aktualizacji ćwiczenia");
        }

        const updatedExercise = await response.json();
        // Clear all cache entries
        exercisesCache.clear();
        setExercises((prev) =>
          prev.map((ex) => (ex.id === id ? updatedExercise.data : ex)),
        );
        return updatedExercise.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
        throw err;
      }
    },
    [API_BASE],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const response = await authFetch(`${API_BASE}/api/exercises/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Błąd usuwania ćwiczenia");
        }

        // Clear all cache entries
        exercisesCache.clear();
        setExercises((prev) => prev.filter((ex) => ex.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
        throw err;
      }
    },
    [API_BASE],
  );

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  return {
    exercises,
    loading,
    error,
    refetch: fetchExercises,
    addExercise,
    updateExercise,
    deleteExercise,
  };
}
