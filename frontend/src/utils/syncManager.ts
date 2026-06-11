/**
 * SyncManager - Background synchronization manager
 * Synchronizuje dane lokalne z serwerem w tle
 */

import { localStore, type SyncOperation } from "./localStore";
import { authFetch, getAuthHeaders } from "./auth";
import { API_BASE } from "@/config/api";

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minuty
const MAX_RETRIES = 3;

type SyncCallback = () => void;
type SyncFailureCallback = (operations: SyncOperation[]) => void;
type WorkoutNotFoundCallback = (workoutId: string) => void;
type TempIdMap = Map<string, string>;

const TEMP_ID_GLOBAL_PATTERN = /temp_[a-z]+_[a-z0-9_]+/gi;
const TEMP_ID_PATTERN = /temp_[a-z]+_[a-z0-9_]+/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const replaceTempIdsInString = (input: string, tempIdMap: TempIdMap): string =>
  input.replace(TEMP_ID_GLOBAL_PATTERN, (match) => tempIdMap.get(match) || match);

const replaceTempIdsDeep = (value: unknown, tempIdMap: TempIdMap): unknown => {
  if (typeof value === "string") {
    return replaceTempIdsInString(value, tempIdMap);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceTempIdsDeep(item, tempIdMap));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        replaceTempIdsDeep(nestedValue, tempIdMap),
      ]),
    );
  }

  return value;
};

const hasUnresolvedTempIds = (value: unknown): boolean => {
  if (typeof value === "string") {
    return TEMP_ID_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnresolvedTempIds(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((nestedValue) =>
      hasUnresolvedTempIds(nestedValue),
    );
  }

  return false;
};

const INTERNAL_SYNC_FIELDS = new Set([
  "clientTempId",
  "clientTempItemId",
  "clientTempSetId",
]);

const stripInternalSyncFields = (
  payload: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload).filter(([key]) => !INTERNAL_SYNC_FIELDS.has(key)),
  );

class SyncManager {
  private syncInterval: number | null = null;
  private isSyncing = false;
  private listeners: Set<SyncCallback> = new Set();
  private failureListeners: Set<SyncFailureCallback> = new Set();
  private workoutNotFoundListeners: Set<WorkoutNotFoundCallback> = new Set();
  private isOnline = navigator.onLine;

  constructor() {
    // Nasłuchuj na zmiany stanu online/offline
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    this.isOnline = true;
    console.log("[SyncManager] Online - starting sync");
    this.syncNow();
  };

  private handleOffline = () => {
    this.isOnline = false;
    console.log("[SyncManager] Offline - sync paused");
  };

  /**
   * Rozpocznij automatyczną synchronizację
   */
  start() {
    if (this.syncInterval) return;

    console.log("[SyncManager] Starting background sync");

    // Synchronizuj od razu
    this.syncNow();

    // Ustaw interwał
    this.syncInterval = window.setInterval(() => {
      this.syncNow();
    }, SYNC_INTERVAL);
  }

  /**
   * Zatrzymaj automatyczną synchronizację
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("[SyncManager] Stopped background sync");
  }

  /**
   * Dodaj listener na zakończenie synchronizacji
   */
  onSync(callback: SyncCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dodaj listener na permanentnie nieudane operacje (przekroczone MAX_RETRIES)
   */
  onSyncFailure(callback: SyncFailureCallback): () => void {
    this.failureListeners.add(callback);
    return () => this.failureListeners.delete(callback);
  }

  onWorkoutNotFound(callback: WorkoutNotFoundCallback): () => void {
    this.workoutNotFoundListeners.add(callback);
    return () => this.workoutNotFoundListeners.delete(callback);
  }

  /**
   * Wykonaj synchronizację teraz
   */
  async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      // 1. Wyślij oczekujące operacje
      await this.processPendingOperations();

      // 2. Pobierz świeże dane z serwera
      await this.fetchFreshData();

      // 3. Zaktualizuj czas ostatniej synchronizacji
      await localStore.setLastSync(Date.now());

      // 4. Powiadom listenerów
      this.listeners.forEach((cb) => cb());

      console.log("[SyncManager] Sync completed");
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Przetwórz oczekujące operacje offline
   */
  private async processPendingOperations(): Promise<void> {
    const operations = await localStore.getPendingSyncOperations();
    const tempIdMap: TempIdMap = new Map();
    const permanentlyFailed: SyncOperation[] = [];

    if (operations.length === 0) return;

    console.log(
      `[SyncManager] Processing ${operations.length} pending operations`,
    );

    // Sortuj po timestamp
    operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of operations) {
      try {
        const resolvedEndpoint = replaceTempIdsInString(op.endpoint, tempIdMap);
        const resolvedData = replaceTempIdsDeep(op.data, tempIdMap);
        const apiData = isPlainObject(resolvedData)
          ? stripInternalSyncFields(resolvedData)
          : resolvedData;

        if (
          hasUnresolvedTempIds(resolvedEndpoint) ||
          hasUnresolvedTempIds(apiData)
        ) {
          continue;
        }

        const fetchOptions: RequestInit = {
          method: op.method,
        };

        if (apiData) {
          fetchOptions.headers = getAuthHeaders();
          fetchOptions.body = JSON.stringify(apiData);
        }

        const response = await authFetch(
          `${API_BASE}${resolvedEndpoint}`,
          fetchOptions,
        );

        if (response.ok) {
          const responseBody = await response
            .clone()
            .json()
            .catch(() => null);
          await this.captureTempIdMappings(
            isPlainObject(resolvedData) ? resolvedData : null,
            responseBody?.data,
            tempIdMap,
          );
          await localStore.removePendingSync(op.id);
          console.log(`[SyncManager] Operation ${op.id} completed`);
        } else if (
          response.status === 404 &&
          (op.entity === "workout" || op.entity === "workoutItem" || op.entity === "set")
        ) {
          await localStore.removePendingSync(op.id);
          permanentlyFailed.push({
            ...op,
            failureReason: "not_found",
          });
          const workoutId = this.resolveWorkoutIdFromOperation(
            op,
            resolvedEndpoint,
          );
          if (workoutId) {
            this.workoutNotFoundListeners.forEach((cb) => cb(workoutId));
          }
          console.warn(`[SyncManager] Operation ${op.id} removed due to 404`);
        } else if (op.retries < MAX_RETRIES) {
          // Zwiększ licznik prób
          await localStore.updatePendingSync({
            ...op,
            retries: op.retries + 1,
          });
        } else {
          await localStore.removePendingSync(op.id);
          permanentlyFailed.push(op);
          console.warn(
            `[SyncManager] Operation ${op.id} failed after ${MAX_RETRIES} retries`,
          );
        }
      } catch (error) {
        const isNetworkError = !navigator.onLine || error instanceof TypeError;
        if (isNetworkError) {
          // Nie incrementujemy retries — operacja zostanie ponowiona przy następnym połączeniu
          console.warn(`[SyncManager] Network error for operation ${op.id}, will retry when online`);
        } else {
          // Nieoczekiwany błąd (np. JSON parse) — traktujemy jak server error
          console.error(`[SyncManager] Failed to process operation ${op.id}:`, error);
          if (op.retries < MAX_RETRIES) {
            await localStore.updatePendingSync({ ...op, retries: op.retries + 1 });
          } else {
            await localStore.removePendingSync(op.id);
            permanentlyFailed.push(op);
          }
        }
      }
    }

    if (permanentlyFailed.length > 0) {
      this.failureListeners.forEach((cb) => cb(permanentlyFailed));
    }
  }

  private async captureTempIdMappings(
    resolvedData: Record<string, unknown> | null,
    responseData: unknown,
    tempIdMap: TempIdMap,
  ): Promise<void> {
    if (!resolvedData || !isPlainObject(responseData)) return;

    const capture = (tempId: unknown, realId: unknown) => {
      if (typeof tempId === "string" && typeof realId === "string") {
        tempIdMap.set(tempId, realId);
      }
    };

    // Workout or exercise creation: clientTempId → response.id
    capture(resolvedData.clientTempId, responseData.id);

    // WorkoutItem creation (addExerciseToWorkout): clientTempItemId → response.id
    capture(resolvedData.clientTempItemId, responseData.id);

    // Set ID mapping — two possible response shapes:
    //   addExerciseToWorkout → WorkoutItem with sets[] (backend creates one default set)
    //   addSet               → WorkoutSet directly (response.id is the set ID)
    if (typeof resolvedData.clientTempSetId === "string") {
      const responseSets = responseData.sets;
      const realSetId =
        Array.isArray(responseSets) && responseSets.length > 0
          ? (responseSets[0] as Record<string, unknown>).id
          : responseData.id;
      capture(resolvedData.clientTempSetId, realSetId);
    }
  }

  private resolveWorkoutIdFromOperation(
    operation: SyncOperation,
    endpoint: string,
  ): string | null {
    if (operation.workoutId) {
      return operation.workoutId;
    }

    const match = endpoint.match(/^\/api\/workouts\/([^/]+)/);
    if (match?.[1] && match[1] !== "items" && match[1] !== "sets") {
      return match[1];
    }

    return null;
  }

  /**
   * Pobierz świeże dane z serwera
   */
  private async fetchFreshData(): Promise<void> {
    try {
      const pendingOperations = await localStore.getPendingSyncOperations();
      const hasPendingWorkoutMutations = pendingOperations.some((operation) =>
        operation.entity === "set" ||
        operation.entity === "workoutItem" ||
        operation.entity === "workout",
      );

      // Pobierz równolegle wszystkie dane
      const [workoutsRes, exercisesRes, activeRes, statsRes, overviewRes] =
        await Promise.all([
          hasPendingWorkoutMutations
            ? Promise.resolve(null)
            : authFetch(`${API_BASE}/api/workouts`).catch(() => null),
          authFetch(`${API_BASE}/api/exercises`).catch(() => null),
          hasPendingWorkoutMutations
            ? Promise.resolve(null)
            : authFetch(`${API_BASE}/api/workouts/active`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/stats/all`).catch(() => null),
          authFetch(`${API_BASE}/api/workouts/stats/overview`).catch(() => null),
        ]);

      // Zapisz workouty
      if (workoutsRes?.ok) {
        const data = await workoutsRes.json();
        if (data.data) {
          await localStore.clear("workouts");
          await localStore.putMany("workouts", data.data);
        }
      }

      // Zapisz ćwiczenia
      if (exercisesRes?.ok) {
        const data = await exercisesRes.json();
        if (data.data) {
          await localStore.clear("exercises");
          await localStore.putMany("exercises", data.data);
        }
      }

      // Zapisz aktywny trening
      if (activeRes?.ok) {
        const data = await activeRes.json();
        await localStore.setActiveWorkoutId(data.data?.activeWorkoutId || null);
      }

      // Zapisz statystyki
      if (statsRes?.ok) {
        const data = await statsRes.json();
        if (data.data) {
          await localStore.clear("stats");
          await localStore.putMany("stats", data.data);
        }
      }

      if (overviewRes?.ok) {
        const data = await overviewRes.json();
        await localStore.setMetadata("statsOverview", data.data || null);
      }
    } catch (error) {
      console.error("[SyncManager] Failed to fetch fresh data:", error);
    }
  }

  /**
   * Zaplanuj operację do synchronizacji (dla trybu offline)
   */
  async queueOperation(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retries">,
  ): Promise<string> {
    const id = await localStore.addPendingSync({
      ...operation,
      timestamp: Date.now(),
      retries: 0,
    });

    // Jeśli online, spróbuj od razu zsynchronizować
    if (this.isOnline) {
      this.syncNow();
    }

    return id;
  }

  /**
   * Sprawdź czy jesteśmy online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
export const syncManager = new SyncManager();

export default syncManager;
