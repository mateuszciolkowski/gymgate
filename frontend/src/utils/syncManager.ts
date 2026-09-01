/**
 * SyncManager - Background synchronization manager
 * Synchronizes local data with the server in the background.
 */

import { localStore, type SyncOperation } from "./localStore";
import { authFetch, getAuthHeaders } from "./auth";
import { API_BASE } from "@/config/api";

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES = 3;
// Ile cykli synchronizacji operacja może czekać na rozwiązanie temp-ID rodzica.
// Ta sama wartość co MAX_RETRIES — przy synchronizacji co 2 min to ~6 minut
// czekania. Jeśli po tym czasie mapowania nadal nie ma (np. operacja-rodzic
// trwale się nie udała), dziecko nigdy się nie rozwiąże. Zamiast blokować
// kolejkę (a przez nią pobieranie świeżych danych) w nieskończoność, oznaczamy
// je jako trwale nieudane — dane zostają w IndexedDB i trafiają do banera.
const MAX_UNRESOLVED_SYNC_CYCLES = 3;

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

// Kolejność ma znaczenie tylko dla czytelności — dla każdej operacji "create" co
// najwyżej jedno z tych pól jest obecne w danych (odpowiada temu, co tworzy dana
// operacja: trening / ćwiczenie / seria). Wszystkie mapują się na to samo pole
// `clientId` po stronie backendu, który dedupikuje po (scope, clientId) — dzięki
// temu retry po timeout/utracie odpowiedzi nie tworzy duplikatu.
const INTERNAL_SYNC_FIELDS = ["clientTempId", "clientTempItemId", "clientTempSetId"] as const;

/**
 * Zamienia wewnętrzne pola śledzenia temp-ID (clientTempId / clientTempItemId /
 * clientTempSetId) na pojedyncze pole `clientId` wysyłane do backendu. Backend
 * używa go do deduplikacji operacji create — bez tego retry (np. po timeout, gdy
 * odpowiedź serwera zginęła) tworzyłby duplikat treningu/ćwiczenia/serii.
 * Dla operacji innych niż create (update/delete) pola te i tak nie występują
 * w danych, więc payload wraca bez zmian.
 */
const mapInternalSyncFieldsToClientId = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  let clientId: unknown;

  for (const [key, value] of Object.entries(payload)) {
    if ((INTERNAL_SYNC_FIELDS as readonly string[]).includes(key)) {
      clientId = value;
      continue;
    }
    result[key] = value;
  }

  if (typeof clientId === "string") {
    result.clientId = clientId;
  }

  return result;
};

/**
 * Usuwa wewnętrzne pola śledzenia temp-ID bez zamiany na `clientId`. Używane
 * WYŁĄCZNIE do sprawdzenia hasUnresolvedTempIds: wartość clientTempItemId /
 * clientTempSetId / clientTempId to zawsze temp-ID *tworzonego właśnie* rekordu
 * (nie referencja do cudzego rodzica), więc pasuje do TEMP_ID_PATTERN i fałszywie
 * wyglądałoby na nierozwiązane odwołanie, gdyby zostało w payloadzie pod tym
 * sprawdzeniem — także po przemapowaniu na `clientId` (ta sama wartość string).
 */
const omitInternalSyncFields = (
  payload: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) => !(INTERNAL_SYNC_FIELDS as readonly string[]).includes(key),
    ),
  );

/**
 * Czy w kolejce czeka jakakolwiek niezsynchronizowana zmiana dotycząca
 * treningu (sam trening, ćwiczenie w treningu lub seria). Jeśli tak, danych
 * treningowych z serwera NIE wolno zapisywać lokalnie — są starsze niż stan
 * lokalny i nadpisałyby zmiany użytkownika.
 *
 * Operacje trwale nieudane (`permanentlyFailed`) są pomijane: nie zostaną już
 * wysłane automatycznie, więc blokowałyby odświeżanie danych na zawsze.
 *
 * `workoutId` zawęża sprawdzenie do jednego treningu (używane przy
 * odświeżaniu pojedynczego treningu).
 */
export const hasPendingWorkoutMutationsNow = async (
  workoutId?: string,
): Promise<boolean> => {
  const operations = await localStore.getPendingSyncOperations();
  return operations.some((operation) => {
    if (operation.permanentlyFailed) return false;
    if (
      operation.entity !== "set" &&
      operation.entity !== "workoutItem" &&
      operation.entity !== "workout"
    ) {
      return false;
    }
    if (!workoutId) return true;
    return (
      operation.workoutId === workoutId ||
      operation.endpoint.includes(workoutId)
    );
  });
};

class SyncManager {
  private syncInterval: number | null = null;
  private isSyncing = false;
  private listeners: Set<SyncCallback> = new Set();
  private failureListeners: Set<SyncFailureCallback> = new Set();
  private workoutNotFoundListeners: Set<WorkoutNotFoundCallback> = new Set();
  private isOnline = navigator.onLine;
  private lastFailureSignature = "";

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
   *
   * `retryFailed` (ręczne "Ponów" z banera) zdejmuje flagę trwałej porażki
   * z operacji w kolejce i zeruje licznik prób — bez czekania na kolejny limit.
   */
  async syncNow(options: { retryFailed?: boolean } = {}): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      if (options.retryFailed) {
        await this.resurrectFailedOperations();
      }

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
   * Zdejmuje flagę trwałej porażki ze wszystkich operacji w kolejce, żeby
   * ręczne "Ponów" spróbowało ich jeszcze raz od zera.
   */
  private async resurrectFailedOperations(): Promise<void> {
    const operations = await localStore.getPendingSyncOperations();
    await Promise.all(
      operations
        .filter((op) => op.permanentlyFailed)
        .map((op) =>
          localStore.updatePendingSync({
            ...op,
            permanentlyFailed: false,
            retries: 0,
            unresolvedCycles: 0,
          }),
        ),
    );
  }

  /**
   * Oznacza operację jako trwale nieudaną. Operacja ZOSTAJE w IndexedDB —
   * nie kasujemy danych użytkownika; jest tylko pomijana w automatycznym
   * retry i widoczna w banerze, skąd można ją ponowić ręcznie.
   */
  private async markPermanentlyFailed(
    op: SyncOperation,
    reason: string,
  ): Promise<SyncOperation> {
    const failed: SyncOperation = { ...op, permanentlyFailed: true };
    await localStore.updatePendingSync(failed);
    console.warn(
      `[SyncManager] Operation ${op.id} permanently failed (${reason}) — kept in queue for manual retry`,
    );
    return failed;
  }

  /**
   * Powiadamia o zbiorze nieudanych operacji tylko wtedy, gdy zmienił się
   * względem poprzedniego przebiegu — dzięki temu odrzucenie banera
   * (`dismissSyncFailures`) nie wraca po każdym cyklu synchronizacji.
   */
  private emitFailures(failures: SyncOperation[]): void {
    const signature = failures
      .map((op) => op.id)
      .sort()
      .join(",");
    if (signature === this.lastFailureSignature) return;
    this.lastFailureSignature = signature;
    this.failureListeners.forEach((cb) => cb(failures));
  }

  /**
   * Process pending offline operations.
   */
  private async processPendingOperations(): Promise<void> {
    const operations = await localStore.getPendingSyncOperations();
    const tempIdMap: TempIdMap = new Map();
    const permanentlyFailed: SyncOperation[] = [];

    if (operations.length === 0) {
      this.emitFailures([]);
      return;
    }

    // Zasiej mapę trwałymi mapowaniami temp->real z poprzednich przebiegów/sesji.
    // Bez tego operacja-dziecko (np. zapis serii) przetworzona w innym przebiegu
    // niż jej rodzic nigdy nie rozwiąże temp-ID i przepadnie po cichu.
    const persistedMappings = await localStore.getIdMappings();
    for (const [tempId, realId] of Object.entries(persistedMappings)) {
      tempIdMap.set(tempId, realId);
    }

    console.log(
      `[SyncManager] Processing ${operations.length} pending operations`,
    );

    // Sort by timestamp
    operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of operations) {
      // Trwale nieudana — nie ponawiamy automatycznie, ale nadal raportujemy
      // ją do banera (i trzymamy w IndexedDB) aż do ręcznego "Ponów".
      if (op.permanentlyFailed) {
        permanentlyFailed.push(op);
        continue;
      }

      try {
        const resolvedEndpoint = replaceTempIdsInString(op.endpoint, tempIdMap);
        const resolvedData = replaceTempIdsDeep(op.data, tempIdMap);

        // Sprawdzenie nierozwiązanych temp-ID musi pominąć wewnętrzne pola —
        // ich wartość to zawsze temp-ID tworzonego właśnie rekordu (pasuje do
        // wzorca temp_*), nie odwołanie do rodzica czekające na rozwiązanie.
        const dataForUnresolvedCheck = isPlainObject(resolvedData)
          ? omitInternalSyncFields(resolvedData)
          : resolvedData;

        if (
          hasUnresolvedTempIds(resolvedEndpoint) ||
          hasUnresolvedTempIds(dataForUnresolvedCheck)
        ) {
          // Czekamy na mapowanie temp->real od operacji-rodzica, ale nie
          // w nieskończoność — inaczej taka operacja trzymałaby guard
          // `hasPendingWorkoutMutationsNow` i blokowała odświeżanie danych.
          const unresolvedCycles = (op.unresolvedCycles ?? 0) + 1;
          if (unresolvedCycles >= MAX_UNRESOLVED_SYNC_CYCLES) {
            permanentlyFailed.push(
              await this.markPermanentlyFailed(op, "unresolved temp id"),
            );
          } else {
            await localStore.updatePendingSync({ ...op, unresolvedCycles });
          }
          continue;
        }

        const apiData = isPlainObject(resolvedData)
          ? mapInternalSyncFieldsToClientId(resolvedData)
          : resolvedData;

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
        } else if (response.status === 404 && op.entity === "workout") {
          // Cały trening zniknął z serwera — usuń go lokalnie.
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
          console.warn(
            `[SyncManager] Workout operation ${op.id} removed due to 404 (workout gone)`,
          );
        } else if (
          response.status === 404 &&
          (op.entity === "workoutItem" || op.entity === "set")
        ) {
          // Pojedynczy element (ćwiczenie w treningu / seria) nie istnieje na
          // serwerze. NIE kasujemy całego treningu — porzucamy tylko tę operację.
          // Pełny refetch (fetchFreshData) pogodzi stan po opróżnieniu kolejki.
          await localStore.removePendingSync(op.id);
          permanentlyFailed.push({
            ...op,
            failureReason: "not_found",
          });
          console.warn(
            `[SyncManager] Item/set operation ${op.id} dropped due to 404 (workout preserved)`,
          );
        } else if (op.retries < MAX_RETRIES) {
          // Increment the retry counter
          await localStore.updatePendingSync({
            ...op,
            retries: op.retries + 1,
          });
        } else {
          permanentlyFailed.push(
            await this.markPermanentlyFailed(
              op,
              `server error after ${MAX_RETRIES} retries`,
            ),
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
            permanentlyFailed.push(
              await this.markPermanentlyFailed(op, "unexpected error"),
            );
          }
        }
      }
    }

    this.emitFailures(permanentlyFailed);
  }

  private async captureTempIdMappings(
    resolvedData: Record<string, unknown> | null,
    responseData: unknown,
    tempIdMap: TempIdMap,
  ): Promise<void> {
    if (!resolvedData || !isPlainObject(responseData)) return;

    const newlyCaptured: Record<string, string> = {};
    const capture = (tempId: unknown, realId: unknown) => {
      if (typeof tempId === "string" && typeof realId === "string") {
        tempIdMap.set(tempId, realId);
        if (tempId.startsWith("temp_")) {
          newlyCaptured[tempId] = realId;
        }
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

    // Utrwal mapowania, by przeżyły kolejne przebiegi sync i reload strony.
    if (Object.keys(newlyCaptured).length > 0) {
      await localStore.addIdMappings(newlyCaptured);
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
      const hasPendingWorkoutMutations = await hasPendingWorkoutMutationsNow();
      // Snapshot lokalnych zmian treningów SPRZED wysłania GET-ów — po ich
      // powrocie sprawdzamy ponownie (patrz niżej), bo przy słabym łączu
      // użytkownik może zdążyć np. zakończyć trening w trakcie zapytania.
      const workoutEpochBefore = localStore.getWorkoutWriteEpoch();

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

      // Dane treningów z serwera są przestarzałe, jeśli w trakcie zapytania
      // pojawiła się lokalna zmiana treningu albo nowa operacja w kolejce.
      // Nadpisanie ich w takiej sytuacji cofnęłoby zmianę użytkownika
      // (np. zakończony trening wracałby do DRAFT).
      const workoutDataIsStale =
        localStore.getWorkoutWriteEpoch() !== workoutEpochBefore ||
        (await hasPendingWorkoutMutationsNow());

      // Persist workouts
      if (workoutsRes?.ok && !workoutDataIsStale) {
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
      if (activeRes?.ok && !workoutDataIsStale) {
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
