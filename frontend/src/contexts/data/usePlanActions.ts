import { useCallback, useMemo } from "react";
import { localStore } from "@/utils/localStore";
import { authFetch, getAuthHeaders } from "@/utils/auth";
import { API_BASE } from "@/config/api";
import type { WorkoutPlan } from "@/types";
import type { DataStore } from "./useDataStore";

const OFFLINE_MESSAGE = "Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.";

/** Workout plan actions - online-only (no offline queue). */
export function usePlanActions(store: DataStore) {
  const { plansRef, setPlans, fetchAllFromServer } = store;

  const createPlan = useCallback(
    async (data: { name: string; exerciseIds: string[]; isPublic: boolean }): Promise<WorkoutPlan> => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

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
    [setPlans],
  );

  const updatePlan = useCallback(
    async (id: string, data: { name?: string; exerciseIds?: string[]; isPublic?: boolean }) => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

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
    [setPlans],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

      const response = await authFetch(`${API_BASE}/api/plans/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Błąd usuwania planu");

      setPlans((prev) => prev.filter((p) => p.id !== id));
      await localStore.delete("plans", id);
    },
    [setPlans],
  );

  const duplicatePlan = useCallback(
    async (id: string): Promise<WorkoutPlan> => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

      const response = await authFetch(`${API_BASE}/api/plans/${id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          fetchAllFromServer().catch(() => {});
          throw new Error("Plan nie istnieje — plany zostały odświeżone, spróbuj ponownie.");
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Błąd duplikacji planu");
      }

      const result = await response.json();
      const newPlan: WorkoutPlan = result.data;

      setPlans((prev) => [newPlan, ...prev]);
      await localStore.put("plans", newPlan);

      return newPlan;
    },
    [fetchAllFromServer, setPlans],
  );

  const favoritePlan = useCallback(
    async (id: string) => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

      const response = await authFetch(`${API_BASE}/api/plans/${id}/favorite`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Błąd dodawania do ulubionych");

      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: true } : p)));
      const updated = plansRef.current.find((p) => p.id === id);
      if (updated) await localStore.put("plans", { ...updated, isFavorite: true });
    },
    [plansRef, setPlans],
  );

  const unfavoritePlan = useCallback(
    async (id: string) => {
      if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE);

      const response = await authFetch(`${API_BASE}/api/plans/${id}/favorite`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) throw new Error("Błąd usuwania z ulubionych");

      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: false } : p)));
      const updated = plansRef.current.find((p) => p.id === id);
      if (updated) await localStore.put("plans", { ...updated, isFavorite: false });
    },
    [plansRef, setPlans],
  );

  return useMemo(
    () => ({
      createPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      favoritePlan,
      unfavoritePlan,
    }),
    [createPlan, updatePlan, deletePlan, duplicatePlan, favoritePlan, unfavoritePlan],
  );
}
