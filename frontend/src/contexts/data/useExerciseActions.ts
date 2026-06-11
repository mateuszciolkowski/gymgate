import { useCallback, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { authFetch, getAuthHeaders } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import type { Exercise } from "@/types";
import type { DataStore } from "./useDataStore";

/** Akcje na ćwiczeniach: CRUD z obsługą offline (temp ID + kolejka sync). */
export function useExerciseActions(store: DataStore) {
  const {
    user,
    setExercises,
    getRealId,
    isOfflineError,
    queueSyncOperation,
    removePendingOperationsReferencingTempId,
  } = store;

  const createExercise = useCallback(
    async (data: {
      name: string;
      muscleGroups: string[];
      description?: string;
      isGlobal?: boolean;
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
    [
      isOfflineError,
      queueSyncOperation,
      setExercises,
      user?.email,
      user?.firstName,
      user?.id,
      user?.lastName,
    ],
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
    [getRealId, isOfflineError, queueSyncOperation, setExercises],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
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
    },
    [
      getRealId,
      isOfflineError,
      queueSyncOperation,
      removePendingOperationsReferencingTempId,
      setExercises,
    ],
  );

  return useMemo(
    () => ({ createExercise, updateExercise, deleteExercise }),
    [createExercise, updateExercise, deleteExercise],
  );
}
