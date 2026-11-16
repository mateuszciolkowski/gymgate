import { isTransient, ReauthRequiredError, type Transport } from "@/api";
import type { WorkoutPlanVersion } from "@/domain/types/workout";

/** Device key/value store (expo-sqlite/kv-store in the app, a fake in tests). */
export interface KvStore {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
}

export interface PlanHistory {
  versions: WorkoutPlanVersion[];
  /** True when the server was unreachable and this is the copy from the last successful download (D-06). */
  cached: boolean;
}

export const HISTORY_OFFLINE_TEXT = "Brak połączenia — historia sprzed ostatniej synchronizacji. Niewysłane zmiany pojawią się tu po wysłaniu.";
export const HISTORY_UNAVAILABLE_TEXT = "Historia planu jest niedostępna bez połączenia z internetem";

const keyOf = (userId: string, planId: string) => `planHistory:${userId}:${planId}`;

/** GET /api/plans/:id/history; a successful answer is kept on the device, an unreachable server falls back to that copy. */
export async function loadPlanHistory(api: Transport, store: KvStore, userId: string, planId: string): Promise<PlanHistory> {
  const key = keyOf(userId, planId);
  try {
    const res = await api.get<{ data: WorkoutPlanVersion[] }>(`/api/plans/${planId}/history`);
    store.setItemSync(key, JSON.stringify(res.data));
    return { versions: res.data, cached: false };
  } catch (error) {
    if (!isTransient(error) && !(error instanceof ReauthRequiredError)) throw error;
    const saved = store.getItemSync(key);
    if (!saved) throw new Error(HISTORY_UNAVAILABLE_TEXT);
    return { versions: JSON.parse(saved) as WorkoutPlanVersion[], cached: true };
  }
}
