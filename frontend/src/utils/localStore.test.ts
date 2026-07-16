// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
// Provides a real, in-memory IndexedDB implementation for the test environment.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

import { localStore } from "./localStore";
import type { SyncOperation } from "./localStore";

// localStore caches the opened DB connection in a module-level variable, so we
// cannot fully reset it per test. Instead we use unique keys per test where it
// matters, and clear the relevant stores up front.
beforeEach(async () => {
  await Promise.all([
    localStore.clear("workouts"),
    localStore.clear("exercises"),
    localStore.clear("stats"),
    localStore.clear("pendingSync"),
    localStore.clear("metadata"),
  ]);
});

const makeSyncOp = (overrides: Partial<SyncOperation> = {}): Omit<SyncOperation, "id"> => ({
  type: "create",
  entity: "set",
  endpoint: "/api/workouts/items/i1/sets",
  method: "POST",
  data: { weight: 50, repetitions: 8 },
  timestamp: Date.now(),
  retries: 0,
  ...overrides,
});

describe("localStore", () => {
  it("ensures fake-indexeddb is active", () => {
    expect(indexedDB).toBeInstanceOf(IDBFactory);
  });

  describe("generic store CRUD", () => {
    it("put + get + getAll + delete + clear round-trips records", async () => {
      await localStore.put("workouts", { id: "w1", name: "A" });
      await localStore.put("workouts", { id: "w2", name: "B" });

      expect(await localStore.get("workouts", "w1")).toEqual({ id: "w1", name: "A" });
      expect((await localStore.getAll("workouts")).length).toBe(2);

      await localStore.delete("workouts", "w1");
      expect(await localStore.get("workouts", "w1")).toBeNull();

      await localStore.clear("workouts");
      expect(await localStore.getAll("workouts")).toEqual([]);
    });

    it("get returns null for a missing key", async () => {
      expect(await localStore.get("exercises", "nope")).toBeNull();
    });

    it("putMany writes all items atomically", async () => {
      await localStore.putMany("exercises", [
        { id: "e1", name: "Squat" },
        { id: "e2", name: "Bench" },
        { id: "e3", name: "Row" },
      ]);
      const all = await localStore.getAll<{ id: string }>("exercises");
      expect(all.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
    });

    it("put overwrites an existing record with the same id", async () => {
      await localStore.put("workouts", { id: "w1", name: "old" });
      await localStore.put("workouts", { id: "w1", name: "new" });
      expect(await localStore.get("workouts", "w1")).toEqual({ id: "w1", name: "new" });
    });
  });

  describe("pending sync queue", () => {
    it("addPendingSync returns a unique id and stores the operation", async () => {
      const id1 = await localStore.addPendingSync(makeSyncOp());
      const id2 = await localStore.addPendingSync(makeSyncOp());

      expect(id1).not.toBe(id2);
      const ops = await localStore.getPendingSyncOperations();
      expect(ops.length).toBe(2);
      expect(ops.map((o) => o.id).sort()).toEqual([id1, id2].sort());
    });

    it("updatePendingSync mutates an existing operation (e.g. retry counter)", async () => {
      const id = await localStore.addPendingSync(makeSyncOp({ retries: 0 }));
      const [op] = await localStore.getPendingSyncOperations();
      await localStore.updatePendingSync({ ...op, retries: 2 });

      const [updated] = await localStore.getPendingSyncOperations();
      expect(updated.retries).toBe(2);
      expect(updated.id).toBe(id);
    });

    it("removePendingSync deletes the operation", async () => {
      const id = await localStore.addPendingSync(makeSyncOp());
      await localStore.removePendingSync(id);
      expect(await localStore.getPendingSyncOperations()).toEqual([]);
    });
  });

  describe("metadata + lastSync", () => {
    it("setMetadata / getMetadata round-trip arbitrary values", async () => {
      await localStore.setMetadata("statsOverview", { totalSets: 42 });
      expect(await localStore.getMetadata("statsOverview")).toEqual({ totalSets: 42 });
    });

    it("getMetadata returns null when missing", async () => {
      expect(await localStore.getMetadata("does-not-exist")).toBeNull();
    });

    it("getLastSync defaults to 0 and persists via setLastSync", async () => {
      expect(await localStore.getLastSync()).toBe(0);
      await localStore.setLastSync(123456);
      expect(await localStore.getLastSync()).toBe(123456);
    });
  });

  describe("active workout helper", () => {
    it("defaults to null and round-trips a workout id", async () => {
      await localStore.setActiveWorkoutId(null);
      expect(await localStore.getActiveWorkoutId()).toBeNull();

      await localStore.setActiveWorkoutId("w-active");
      expect(await localStore.getActiveWorkoutId()).toBe("w-active");

      await localStore.setActiveWorkoutId(null);
      expect(await localStore.getActiveWorkoutId()).toBeNull();
    });
  });

  describe("id mappings (temp -> real) — persistence of the offline-sync fix", () => {
    it("getIdMappings defaults to an empty object", async () => {
      expect(await localStore.getIdMappings()).toEqual({});
    });

    it("addIdMappings merges new entries with existing ones", async () => {
      await localStore.addIdMappings({ temp_workout_1: "w-real" });
      await localStore.addIdMappings({ temp_item_1: "i-real", temp_set_1: "s-real" });

      expect(await localStore.getIdMappings()).toEqual({
        temp_workout_1: "w-real",
        temp_item_1: "i-real",
        temp_set_1: "s-real",
      });
    });

    it("addIdMappings overwrites a mapping for the same temp id", async () => {
      await localStore.addIdMappings({ temp_x: "first" });
      await localStore.addIdMappings({ temp_x: "second" });
      expect((await localStore.getIdMappings()).temp_x).toBe("second");
    });

    it("addIdMappings with no entries is a no-op", async () => {
      await localStore.addIdMappings({ temp_x: "v" });
      await localStore.addIdMappings({});
      expect(await localStore.getIdMappings()).toEqual({ temp_x: "v" });
    });
  });
});
