/**
 * SyncManager - Background synchronization manager
 * Synchronizes local data with the server in the background.
 */

import { localStore, type SyncOperation } from "./localStore";
import { authFetch, getAuthHeaders } from "./auth";
import { API_BASE } from "@/config/api";

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
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
    // Listen for online/offline state changes
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
   * Start automatic synchronization.
   */
  start() {
    if (this.syncInterval) return;

    console.log("[SyncManager] Starting background sync");

    // Sync immediately
    this.syncNow();

    // Set up the interval
    this.syncInterval = window.setInterval(() => {
      this.syncNow();
    }, SYNC_INTERVAL);
  }

  /**
   * Stop automatic synchronization.
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("[SyncManager] Stopped background sync");
  }

  /**
   * Add a listener invoked when synchronization completes.
   */
  onSync(callback: SyncCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Add a listener for permanently failed operations (MAX_RETRIES exceeded).
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
   * Run synchronization now.
   */
  async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      // 1. Send pending operations
      await this.processPendingOperations();

      // 2. Fetch fresh data from the server
      await this.fetchFreshData();

      // 3. Update the last sync timestamp
      await localStore.setLastSync(Date.now());

      // 4. Notify listeners
      this.listeners.forEach((cb) => cb());

      console.log("[SyncManager] Sync completed");
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process pending offline operations.
   */
  private async processPendingOperations(): Promise<void> {
    const operations = await localStore.getPendingSyncOperations();
    const tempIdMap: TempIdMap = new Map();
    const permanentlyFailed: SyncOperation[] = [];

    if (operations.length === 0) return;

    console.log(
      `[SyncManager] Processing ${operations.length} pending operations`,
    );

    // Sort by timestamp
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
          // Increment the retry counter
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
          // Do not increment retries — the operation will be retried on the next connection
          console.warn(`[SyncManager] Network error for operation ${op.id}, will retry when online`);
        } else {
          // Unexpected error (e.g. JSON parse) — treated as a server error
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
   * Fetch fresh data from the server.
   */
  private async fetchFreshData(): Promise<void> {
    try {
      const pendingOperations = await localStore.getPendingSyncOperations();
      const hasPendingWorkoutMutations = pendingOperations.some((operation) =>
        operation.entity === "set" ||
        operation.entity === "workoutItem" ||
        operation.entity === "workout",
      );

      // Fetch all data in parallel
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

      // Persist workouts
      if (workoutsRes?.ok) {
        const data = await workoutsRes.json();
        if (data.data) {
          await localStore.clear("workouts");
          await localStore.putMany("workouts", data.data);
        }
      }

      // Persist exercises
      if (exercisesRes?.ok) {
        const data = await exercisesRes.json();
        if (data.data) {
          await localStore.clear("exercises");
          await localStore.putMany("exercises", data.data);
        }
      }

      // Persist the active workout
      if (activeRes?.ok) {
        const data = await activeRes.json();
        await localStore.setActiveWorkoutId(data.data?.activeWorkoutId || null);
      }

      // Persist stats
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
   * Queue an operation for synchronization (used in offline mode).
   */
  async queueOperation(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retries">,
  ): Promise<string> {
    const id = await localStore.addPendingSync({
      ...operation,
      timestamp: Date.now(),
      retries: 0,
    });

    // If online, try to sync immediately
    if (this.isOnline) {
      this.syncNow();
    }

    return id;
  }

  /**
   * Check whether we are online.
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
export const syncManager = new SyncManager();

export default syncManager;
