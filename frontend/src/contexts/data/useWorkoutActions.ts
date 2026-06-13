import { useCallback, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { authFetch, getAuthHeaders } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import type { Workout } from "@/types";
import { WorkoutNotFoundError } from "./types";
import type { DataStore } from "./useDataStore";

/** Workout actions: CRUD, completion, refresh, and skipping plan exercises. */
export function useWorkoutActions(store: DataStore) {
  const {
    user,
    workoutsRef,
    setWorkouts,
    setActiveWorkoutId,
    getRealId,
    isOfflineError,
    queueSyncOperation,
    removePendingOperationsReferencingTempId,
    purgeLocalWorkout,
    invalidateProgressionCache,
    refreshStatsData,
    fetchAllFromServer,
  } = store;

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

        if (!response.ok) {
          if (response.status === 404) {
            // Plan ID may be stale — refresh plans and surface a clear message
            fetchAllFromServer().catch(() => {});
            throw new Error("Plan nie istnieje — plany zostały odświeżone, spróbuj ponownie.");
          }
          throw new Error("Błąd tworzenia treningu");
        }

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
    [isOfflineError, queueSyncOperation, setActiveWorkoutId, setWorkouts, user?.id, fetchAllFromServer],
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
    [getRealId, isOfflineError, purgeLocalWorkout, queueSyncOperation, setActiveWorkoutId, setWorkouts],
  );

  const deleteWorkout = useCallback(
    async (id: string) => {
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
    },
    [
      getRealId,
      invalidateProgressionCache,
      isOfflineError,
      purgeLocalWorkout,
      queueSyncOperation,
      refreshStatsData,
      removePendingOperationsReferencingTempId,
      setActiveWorkoutId,
      setWorkouts,
      workoutsRef,
    ],
  );

  const getWorkout = useCallback(
    (id: string) => workoutsRef.current.find((w) => w.id === id),
    [workoutsRef],
  );

  // Refresh a single workout
  const refreshWorkout = useCallback(
    async (id: string) => {
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
    },
    [purgeLocalWorkout, setWorkouts],
  );

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

  const skipPlanExercise = useCallback(
    async (workoutId: string, exerciseId: string) => {
      const realWorkoutId = getRealId(workoutId);

      let previousWorkout: Workout | null = null;
      // Compute synchronously from the ref - the setState updater is asynchronous
      const currentWorkout = workoutsRef.current.find((w) => w.id === workoutId);
      if (
        currentWorkout &&
        !(currentWorkout.skippedPlanExerciseIds ?? []).includes(exerciseId)
      ) {
        previousWorkout = currentWorkout;
        const updatedWorkout: Workout = {
          ...currentWorkout,
          skippedPlanExerciseIds: [
            ...(currentWorkout.skippedPlanExerciseIds ?? []),
            exerciseId,
          ],
        };
        setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? updatedWorkout : w)));
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
    },
    [getRealId, setWorkouts, workoutsRef],
  );

  return useMemo(
    () => ({
      createWorkout,
      updateWorkout,
      deleteWorkout,
      getWorkout,
      refreshWorkout,
      completeWorkout,
      skipPlanExercise,
    }),
    [
      createWorkout,
      updateWorkout,
      deleteWorkout,
      getWorkout,
      refreshWorkout,
      completeWorkout,
      skipPlanExercise,
    ],
  );
}
