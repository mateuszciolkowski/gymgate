import { useCallback, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { authFetch, getAuthHeaders } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import type { Workout, WorkoutItem, WorkoutSet } from "@/types";
import { WorkoutNotFoundError } from "./types";
import type { DataStore } from "./useDataStore";

/**
 * Workout item and set actions - all with optimistic UI + IndexedDB
 * updates and an offline sync queue.
 */
export function useWorkoutItemActions(store: DataStore) {
  const {
    workoutsRef,
    exercisesRef,
    idMappingRef,
    setWorkouts,
    getRealId,
    isOfflineError,
    queueSyncOperation,
    removePendingOperationsReferencingTempId,
    purgeLocalWorkout,
    invalidateProgressionCache,
    refreshStatsData,
  } = store;

  const addExerciseToWorkout = useCallback(
    async (workoutId: string, exerciseId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const shouldRefreshStats =
        workoutsRef.current.find((workout) => workout.id === workoutId)?.status ===
        "COMPLETED";
      const tempItemId = `temp_item_${Date.now()}`;

      // Read the exercise from the ref (not from state, to avoid creating a dependency)
      const exercise = exercisesRef.current.find((e) => e.id === exerciseId);
      if (!exercise) throw new Error("Nie znaleziono ćwiczenia");

      // Optimistic update - add to the UI immediately, with no sets (the first set is a draftSet in the UI)
      const newItem = {
        id: tempItemId,
        workoutId,
        exerciseId,
        orderInWorkout: 0, // will be computed in the callback
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

      // Compute the updated workout synchronously from the ref - the setState updater
      // is asynchronous, so its result cannot be read immediately after the call.
      const currentWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      if (currentWorkout) {
        const itemWithOrder = {
          ...newItem,
          orderInWorkout: currentWorkout.items.length + 1,
        };
        const updatedWorkout: Workout = {
          ...currentWorkout,
          items: [...currentWorkout.items, itemWithOrder as WorkoutItem],
        };
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
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
    [
      exercisesRef,
      getRealId,
      idMappingRef,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      setWorkouts,
      workoutsRef,
    ],
  );

  const removeExerciseFromWorkout = useCallback(
    async (workoutId: string, itemId: string) => {
      const realWorkoutId = getRealId(workoutId);
      const originalWorkout = workoutsRef.current.find((workout) => workout.id === workoutId);
      const removedItem = originalWorkout?.items.find((item) => item.id === itemId);
      const shouldRefreshStats = originalWorkout?.status === "COMPLETED";
      // Save the original item for rollback (from the ref, synchronously)
      const originalItem: WorkoutItem | null =
        originalWorkout?.items.find((i) => i.id === itemId) ?? null;

      // Optimistic update - compute synchronously from the ref
      if (originalWorkout) {
        const updatedWorkout: Workout = {
          ...originalWorkout,
          items: originalWorkout.items.filter((i) => i.id !== itemId),
        };
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
        await localStore.put("workouts", updatedWorkout);
      }

      // Send to the server in the background - use the real ID if we have a mapping
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
      // If the ID is temporary, the removal is local only
      if (shouldRefreshStats) {
        await refreshStatsData();
        await invalidateProgressionCache(removedItem?.exerciseId);
      }
    },
    [
      getRealId,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      removePendingOperationsReferencingTempId,
      setWorkouts,
      workoutsRef,
    ],
  );

  const updateWorkoutItem = useCallback(
    async (workoutId: string, itemId: string, data: { notes?: string | null }) => {
      const realWorkoutId = getRealId(workoutId);
      const originalWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      const originalItem = originalWorkout?.items.find((i) => i.id === itemId);

      // Optimistic update - compute synchronously from the ref
      if (originalWorkout) {
        const updatedWorkout: Workout = {
          ...originalWorkout,
          items: originalWorkout.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              notes: data.notes ?? null,
              updatedAt: new Date().toISOString(),
            };
          }),
        };
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
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
    [getRealId, isOfflineError, purgeLocalWorkout, queueSyncOperation, setWorkouts, workoutsRef],
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
      // Temporary ID
      const tempSetId = `temp_set_${Date.now()}`;

      // Optimistic update - compute synchronously from the ref
      const currentWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      if (currentWorkout) {
        const updatedWorkout: Workout = {
          ...currentWorkout,
          items: currentWorkout.items.map((item) => {
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
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
        await localStore.put("workouts", updatedWorkout);
      }

      // Send to the server in the background
      // Use the real ID if we have a mapping, otherwise check whether it is a temp ID
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
    [
      getRealId,
      idMappingRef,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      setWorkouts,
      workoutsRef,
    ],
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

      // Optimistic update - compute synchronously from the ref
      const currentWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      if (currentWorkout) {
        // Find the original before modifying (for rollback)
        currentWorkout.items.forEach((item) => {
          const set = item.sets.find((s) => s.id === setId);
          if (set && !originalSet) originalSet = { ...set };
        });

        const updatedWorkout: Workout = {
          ...currentWorkout,
          items: currentWorkout.items.map((item) => ({
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
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
        await localStore.put("workouts", updatedWorkout);
      }

      // Send to the server in the background - use the real ID if we have a mapping
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
    [
      getRealId,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      setWorkouts,
      workoutsRef,
    ],
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

      // Optimistic update - compute synchronously from the ref
      const currentWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      if (currentWorkout) {
        // Find the original before modifying (for rollback)
        currentWorkout.items.forEach((item) => {
          const set = item.sets.find((s) => s.id === setId);
          if (set && !originalSet) originalSet = { ...set };
        });

        const updatedWorkout: Workout = {
          ...currentWorkout,
          items: currentWorkout.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              sets: item.sets.filter((s) => s.id !== setId),
            };
          }),
        };
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
        await localStore.put("workouts", updatedWorkout);
      }

      // Send to the server in the background - use the real ID if we have a mapping
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
      getRealId,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      removePendingOperationsReferencingTempId,
      setWorkouts,
      workoutsRef,
    ],
  );

  return useMemo(
    () => ({
      addExerciseToWorkout,
      removeExerciseFromWorkout,
      updateWorkoutItem,
      addSet,
      updateSet,
      deleteSet,
    }),
    [
      addExerciseToWorkout,
      removeExerciseFromWorkout,
      updateWorkoutItem,
      addSet,
      updateSet,
      deleteSet,
    ],
  );
}
