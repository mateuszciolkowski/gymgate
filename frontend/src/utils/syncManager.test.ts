// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks for the two collaborators of SyncManager -------------------------
vi.mock("./localStore", () => {
  const localStore = {
    getPendingSyncOperations: vi.fn(),
    getIdMappings: vi.fn(),
    addIdMappings: vi.fn(),
    addPendingSync: vi.fn(),
    removePendingSync: vi.fn(),
    updatePendingSync: vi.fn(),
    setLastSync: vi.fn(),
    setActiveWorkoutId: vi.fn(),
    setMetadata: vi.fn(),
    clear: vi.fn(),
    putMany: vi.fn(),
    getWorkoutWriteEpoch: vi.fn(() => 0),
  };
  return { localStore, default: localStore };
});

vi.mock("./auth", () => ({
  authFetch: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ "Content-Type": "application/json" })),
}));

import { syncManager } from "./syncManager";
import { localStore } from "./localStore";
import { authFetch } from "./auth";
import type { SyncOperation } from "./localStore";

const mockedStore = localStore as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockedFetch = authFetch as unknown as ReturnType<typeof vi.fn>;

// Minimal fetch Response stand-in covering the surface SyncManager uses.
const makeRes = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  clone: () => ({ json: async () => body }),
  json: async () => body,
});

const baseOp = (overrides: Partial<SyncOperation> = {}): SyncOperation => ({
  id: "op-1",
  type: "create",
  entity: "set",
  endpoint: "/api/workouts/items/item-1/sets",
  method: "POST",
  data: { weight: 50, repetitions: 8, setNumber: 1 },
  timestamp: 1,
  retries: 0,
  ...overrides,
});

// Parse the JSON body the SyncManager sent on its FIRST authFetch call.
const sentBody = () => {
  const firstCall = mockedFetch.mock.calls[0];
  const init = firstCall?.[1] as RequestInit | undefined;
  return init?.body ? JSON.parse(init.body as string) : null;
};

const sentUrl = () => mockedFetch.mock.calls[0]?.[0] as string | undefined;

// Control connectivity WITHOUT dispatching window events — the "online" event
// would trigger an extra background syncNow() that races with the test body.
const setOnline = (value: boolean) => {
  (syncManager as unknown as { isOnline: boolean }).isOnline = value;
};

describe("syncManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state between tests (singleton).
    (syncManager as unknown as { isOnline: boolean }).isOnline = true;
    (syncManager as unknown as { isSyncing: boolean }).isSyncing = false;
    (syncManager as unknown as { lastFailureSignature: string }).lastFailureSignature = "";
    // Sensible defaults — overridden per test.
    mockedStore.getPendingSyncOperations.mockResolvedValue([]);
    mockedStore.getIdMappings.mockResolvedValue({});
    mockedStore.addIdMappings.mockResolvedValue(undefined);
    mockedStore.addPendingSync.mockResolvedValue("op-generated");
    mockedStore.removePendingSync.mockResolvedValue(undefined);
    mockedStore.updatePendingSync.mockResolvedValue(undefined);
    mockedStore.setLastSync.mockResolvedValue(undefined);
    mockedStore.setActiveWorkoutId.mockResolvedValue(undefined);
    mockedStore.setMetadata.mockResolvedValue(undefined);
    mockedStore.clear.mockResolvedValue(undefined);
    mockedStore.putMany.mockResolvedValue(undefined);
    mockedStore.getWorkoutWriteEpoch.mockReturnValue(0);
    // Default response for fetchFreshData GETs.
    mockedFetch.mockResolvedValue(makeRes(200, { data: null }));
  });

  it("resolves temp ids in endpoint and data, maps internal field to clientId, captures + persists mapping, removes op", async () => {
    mockedStore.getIdMappings.mockResolvedValue({ temp_item_1: "item-real" });
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        endpoint: "/api/workouts/items/temp_item_1/sets",
        data: {
          weight: 50,
          repetitions: 8,
          setNumber: 1,
          clientTempSetId: "temp_set_9",
        },
      }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(201, { data: { id: "set-real" } }));

    await syncManager.syncNow();

    // temp_item_1 resolved in the endpoint
    expect(sentUrl()).toContain("/api/workouts/items/item-real/sets");
    // internal client field mapped to clientId (for backend dedupe) before hitting the API
    expect(sentBody()).toEqual({
      weight: 50,
      repetitions: 8,
      setNumber: 1,
      clientId: "temp_set_9",
    });
    // captured set mapping persisted
    expect(mockedStore.addIdMappings).toHaveBeenCalledWith({ temp_set_9: "set-real" });
    // op removed after success
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("op-1");
  });

  it("captures workout create mapping (clientTempId -> response.id) and forwards it as clientId", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        entity: "workout",
        endpoint: "/api/workouts",
        data: { workoutName: "Push", clientTempId: "temp_workout_1" },
      }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(201, { data: { id: "w-real" } }));

    await syncManager.syncNow();

    expect(sentBody()).toEqual({ workoutName: "Push", clientId: "temp_workout_1" });
    expect(mockedStore.addIdMappings).toHaveBeenCalledWith({ temp_workout_1: "w-real" });
  });

  it("maps clientTempItemId to clientId for addExerciseToWorkout retries", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        entity: "workoutItem",
        endpoint: "/api/workouts/w1/exercises",
        data: { exerciseId: "e1", clientTempItemId: "temp_item_5" },
      }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(201, { data: { id: "item-real" } }));

    await syncManager.syncNow();

    expect(sentBody()).toEqual({ exerciseId: "e1", clientId: "temp_item_5" });
  });

  it("captures set id from addExercise response shape (sets[0].id)", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        entity: "workoutItem",
        endpoint: "/api/workouts/w1/exercises",
        data: { exerciseId: "e1", clientTempItemId: "temp_item_5", clientTempSetId: "temp_set_5" },
      }),
    ]);
    mockedFetch.mockResolvedValueOnce(
      makeRes(201, { data: { id: "item-real", sets: [{ id: "set-real-0" }] } }),
    );

    await syncManager.syncNow();

    expect(mockedStore.addIdMappings).toHaveBeenCalledWith(
      expect.objectContaining({ temp_item_5: "item-real", temp_set_5: "set-real-0" }),
    );
  });

  it("skips operations with unresolved temp ids without touching retries or removing them", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({ endpoint: "/api/workouts/items/temp_item_unknown/sets" }),
    ]);

    await syncManager.syncNow();

    // op POST must not be sent
    const sentToSets = mockedFetch.mock.calls.some(([url]) =>
      String(url).includes("temp_item_unknown"),
    );
    expect(sentToSets).toBe(false);
    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
    // Licznik prób nietknięty; rośnie tylko licznik cykli czekania na mapowanie.
    expect(mockedStore.updatePendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "op-1", retries: 0, unresolvedCycles: 1 }),
    );
  });

  it("workout 404 purges the workout (notifies workoutNotFound listener) and reports failure", async () => {
    const onNotFound = vi.fn();
    const onFailure = vi.fn();
    const off1 = syncManager.onWorkoutNotFound(onNotFound);
    const off2 = syncManager.onSyncFailure(onFailure);

    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({ entity: "workout", endpoint: "/api/workouts/w1", method: "PATCH", workoutId: "w1" }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(404, {}));

    await syncManager.syncNow();

    expect(onNotFound).toHaveBeenCalledWith("w1");
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("op-1");
    expect(onFailure).toHaveBeenCalled();
    off1();
    off2();
  });

  it("set 404 does NOT purge the workout — only drops the op and reports failure", async () => {
    const onNotFound = vi.fn();
    const onFailure = vi.fn();
    const off1 = syncManager.onWorkoutNotFound(onNotFound);
    const off2 = syncManager.onSyncFailure(onFailure);

    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({ entity: "set", workoutId: "w1" }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(404, {}));

    await syncManager.syncNow();

    expect(onNotFound).not.toHaveBeenCalled(); // workout preserved
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("op-1");
    expect(onFailure).toHaveBeenCalled();
    off1();
    off2();
  });

  it("workoutItem 404 does NOT purge the workout", async () => {
    const onNotFound = vi.fn();
    const off = syncManager.onWorkoutNotFound(onNotFound);

    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({ entity: "workoutItem", endpoint: "/api/workouts/items/item-1", method: "DELETE", workoutId: "w1" }),
    ]);
    mockedFetch.mockResolvedValueOnce(makeRes(404, {}));

    await syncManager.syncNow();

    expect(onNotFound).not.toHaveBeenCalled();
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("op-1");
    off();
  });

  it("network error (TypeError) keeps the op and does NOT increment retries", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([baseOp({ retries: 0 })]);
    mockedFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await syncManager.syncNow();

    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
    expect(mockedStore.updatePendingSync).not.toHaveBeenCalled();
  });

  it("server error below MAX_RETRIES increments the retry counter", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([baseOp({ retries: 1 })]);
    mockedFetch.mockResolvedValueOnce(makeRes(500, {}));

    await syncManager.syncNow();

    expect(mockedStore.updatePendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "op-1", retries: 2 }),
    );
    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
  });

  it("server error at MAX_RETRIES marks the op permanently failed but KEEPS it in the queue", async () => {
    const onFailure = vi.fn();
    const off = syncManager.onSyncFailure(onFailure);

    mockedStore.getPendingSyncOperations.mockResolvedValue([baseOp({ retries: 3 })]);
    mockedFetch.mockResolvedValueOnce(makeRes(500, {}));

    await syncManager.syncNow();

    // Dane NIE mogą zniknąć z IndexedDB.
    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
    expect(mockedStore.updatePendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "op-1", permanentlyFailed: true }),
    );
    expect(onFailure).toHaveBeenCalledWith([
      expect.objectContaining({ id: "op-1", permanentlyFailed: true }),
    ]);
    off();
  });

  it("permanently failed op is skipped by the automatic loop but still reported", async () => {
    const onFailure = vi.fn();
    const off = syncManager.onSyncFailure(onFailure);

    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({ retries: 3, permanentlyFailed: true }),
    ]);

    await syncManager.syncNow();

    // Nie wysyłamy jej automatycznie...
    const sentSetPost = mockedFetch.mock.calls.some(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(sentSetPost).toBe(false);
    // ...i nadal jej nie kasujemy.
    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith([
      expect.objectContaining({ id: "op-1" }),
    ]);
    off();
  });

  it("manual retry (syncNow with retryFailed) clears the flag and re-sends the op", async () => {
    const failedOp = baseOp({ retries: 3, permanentlyFailed: true });
    mockedStore.getPendingSyncOperations.mockResolvedValue([failedOp]);
    // 1. resurrect zapisuje op bez flagi, 2. POST się udaje
    mockedStore.updatePendingSync.mockImplementation(async (op: SyncOperation) => {
      mockedStore.getPendingSyncOperations.mockResolvedValue([op]);
    });
    mockedFetch.mockResolvedValueOnce(makeRes(201, { data: { id: "set-real" } }));

    await syncManager.syncNow({ retryFailed: true });

    expect(mockedStore.updatePendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "op-1", permanentlyFailed: false, retries: 0 }),
    );
    // Operacja poszła na serwer i dopiero po sukcesie zniknęła z kolejki.
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("op-1");
  });

  it("op stuck on an unresolved temp id is marked failed after MAX_UNRESOLVED_SYNC_CYCLES and stops blocking fresh workout data", async () => {
    // Ostatni cykl czekania — mapowania nadal brak.
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        endpoint: "/api/workouts/items/temp_item_orphan/sets",
        unresolvedCycles: 2,
      }),
    ]);

    await syncManager.syncNow();

    expect(mockedStore.updatePendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "op-1", permanentlyFailed: true }),
    );
    expect(mockedStore.removePendingSync).not.toHaveBeenCalled();
  });

  it("a permanently failed workout op no longer blocks fetching fresh workouts", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      baseOp({
        entity: "set",
        endpoint: "/api/workouts/items/temp_item_orphan/sets",
        permanentlyFailed: true,
      }),
    ]);
    mockedFetch.mockResolvedValue(makeRes(200, { data: [{ id: "w1" }] }));

    await syncManager.syncNow();

    // Guard nie blokuje już odświeżania — aplikacja nie utyka na stanie lokalnym.
    expect(mockedStore.clear).toHaveBeenCalledWith("workouts");
    expect(mockedStore.putMany).toHaveBeenCalledWith("workouts", [{ id: "w1" }]);
  });

  it("does NOT overwrite workouts when a local workout change lands while the GETs are in flight", async () => {
    // Kolejka pusta na starcie → fetchFreshData wysyła GET-y.
    mockedStore.getPendingSyncOperations.mockResolvedValue([]);
    // Użytkownik kończy trening w trakcie trwania GET-ów → licznik lokalnych
    // zapisów rośnie zanim odpowiedź serwera (jeszcze ze statusem DRAFT) wróci.
    mockedStore.getWorkoutWriteEpoch
      .mockReturnValueOnce(0)
      .mockReturnValue(1);
    mockedFetch.mockResolvedValue(
      makeRes(200, { data: [{ id: "w1", status: "DRAFT" }] }),
    );

    await syncManager.syncNow();

    expect(mockedStore.clear).not.toHaveBeenCalledWith("workouts");
    expect(mockedStore.putMany).not.toHaveBeenCalledWith(
      "workouts",
      expect.anything(),
    );
    expect(mockedStore.setActiveWorkoutId).not.toHaveBeenCalled();
    // Pozostałe dane (ćwiczenia, statystyki) wolno odświeżyć normalnie.
    expect(mockedStore.clear).toHaveBeenCalledWith("exercises");
  });

  it("does nothing while offline", async () => {
    setOnline(false);

    await syncManager.syncNow();

    expect(mockedStore.getPendingSyncOperations).not.toHaveBeenCalled();
  });

  it("queueOperation persists the op via localStore.addPendingSync", async () => {
    const id = await syncManager.queueOperation({
      type: "create",
      entity: "set",
      endpoint: "/api/workouts/items/item-1/sets",
      method: "POST",
      data: { weight: 10, repetitions: 5, setNumber: 1 },
    });

    expect(mockedStore.addPendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "set", retries: 0 }),
    );
    expect(id).toBe("op-generated");
  });

  it("processes multiple ops in timestamp order so a parent create resolves a child reference", async () => {
    mockedStore.getPendingSyncOperations.mockResolvedValue([
      // child queued out of order (later in array but must run after parent)
      baseOp({
        id: "child",
        entity: "set",
        endpoint: "/api/workouts/items/temp_item_X/sets",
        timestamp: 20,
        data: { weight: 40, repetitions: 6, setNumber: 1 },
      }),
      baseOp({
        id: "parent",
        entity: "workoutItem",
        endpoint: "/api/workouts/w1/exercises",
        timestamp: 10,
        data: { exerciseId: "e1", clientTempItemId: "temp_item_X" },
      }),
    ]);
    // parent response first (sorted), then child
    mockedFetch
      .mockResolvedValueOnce(makeRes(201, { data: { id: "item-real-X" } }))
      .mockResolvedValueOnce(makeRes(201, { data: { id: "set-real-X" } }));

    await syncManager.syncNow();

    const childUrl = mockedFetch.mock.calls.find(([url]) =>
      String(url).includes("/sets"),
    )?.[0];
    expect(String(childUrl)).toContain("/api/workouts/items/item-real-X/sets");
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("parent");
    expect(mockedStore.removePendingSync).toHaveBeenCalledWith("child");
  });
});
