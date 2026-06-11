import { useCallback, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { authFetch, getAuthHeaders } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import type { Workout, WorkoutItem, WorkoutSet } from "@/types";
import { WorkoutNotFoundError } from "./types";
import type { DataStore } from "./useDataStore";

/**
 * Akcje na pozycjach treningu i seriach - wszystkie z optymistyczną
 * aktualizacją UI + IndexedDB i kolejką sync w trybie offline.
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
