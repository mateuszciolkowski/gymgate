/**
 * LocalStore - IndexedDB based offline-first storage
 * Enables offline work and fast application performance.
 */

const DB_NAME = "gymgate_db";
const DB_VERSION = 2;

interface StoreConfig {
  exercises: { key: string; data: unknown };
  workouts: { key: string; data: unknown };
  activeWorkout: { key: string; data: unknown };
  stats: { key: string; data: unknown };
  plans: { key: string; data: unknown };
  pendingSync: { key: string; data: SyncOperation };
  metadata: { key: string; data: { lastSync?: number; value?: unknown } };
}

export interface SyncOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "workout" | "exercise" | "set" | "workoutItem" | "plan";
  workoutId?: string;
  endpoint: string;
  method: string;
  data?: unknown;
  failureReason?: "not_found";
  timestamp: number;
  retries: number;
  /**
   * Operacja wyczerpała limit prób (albo od zbyt wielu cykli czeka na
   * nierozwiązane temp-ID). NIE jest kasowana z IndexedDB — pomijamy ją tylko
   * w automatycznym retry, pokazujemy w banerze i użytkownik może ponowić
   * ręcznie. Dane treningu nie giną nawet po restarcie aplikacji.
   */
  permanentlyFailed?: boolean;
  /** Ile cykli synchronizacji operacja przeczekała z nierozwiązanym temp-ID. */
  unresolvedCycles?: number;
}

let db: IDBDatabase | null = null;

// Counter of local (optimistic) writes to a single workout.
// A server refresh takes a snapshot before firing off its GETs and compares
// it after they return — if the user changed something locally in the
// meantime (e.g. completed the workout on a flaky connection), the stale
// server response does NOT overwrite that change. Bulk writes (putMany/clear)
// come from refreshes themselves, so they don't bump the counter.
let workoutWriteEpoch = 0;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));

    request.onsuccess = () => {
      const opened = request.result;
      // iOS can close the connection while the app is in the background, and a
      // newer tab/version may request an upgrade - drop the cached handle so the
      // next call reopens instead of failing with InvalidStateError forever.
      opened.onclose = () => {
        if (db === opened) db = null;
      };
      opened.onversionchange = () => {
        opened.close();
        if (db === opened) db = null;
      };
      db = opened;
      resolve(opened);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for exercises
      if (!database.objectStoreNames.contains("exercises")) {
        database.createObjectStore("exercises", { keyPath: "id" });
      }

      // Store for workouts
      if (!database.objectStoreNames.contains("workouts")) {
        database.createObjectStore("workouts", { keyPath: "id" });
      }

      // Store for the active workout
      if (!database.objectStoreNames.contains("activeWorkout")) {
        database.createObjectStore("activeWorkout", { keyPath: "key" });
      }

      // Store for stats
      if (!database.objectStoreNames.contains("stats")) {
        database.createObjectStore("stats", { keyPath: "id" });
      }

      // Store for workout plans
      if (!database.objectStoreNames.contains("plans")) {
        database.createObjectStore("plans", { keyPath: "id" });
      }

      // Store for pending sync operations
      if (!database.objectStoreNames.contains("pendingSync")) {
        const store = database.createObjectStore("pendingSync", {
          keyPath: "id",
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Store for metadata (last sync timestamp, etc.)
      if (!database.objectStoreNames.contains("metadata")) {
        database.createObjectStore("metadata", { keyPath: "key" });
      }
    };
  });
};

// Starts a transaction, transparently reopening the DB once if the cached
// connection was closed by the browser.
const openTx = async (
  storeName: keyof StoreConfig,
  mode: IDBTransactionMode,
): Promise<IDBTransaction> => {
  try {
    return (await openDB()).transaction(storeName, mode);
  } catch (error) {
    if (error instanceof DOMException && error.name === "InvalidStateError") {
      db = null;
      return (await openDB()).transaction(storeName, mode);
    }
    throw error;
  }
};

// Generic CRUD operations
export const localStore = {
  async get<T>(storeName: keyof StoreConfig, key: string): Promise<T | null> {
    const transaction = await openTx(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async getAll<T>(storeName: keyof StoreConfig): Promise<T[]> {
    const transaction = await openTx(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  /** Numer wersji lokalnych zmian treningów — patrz `workoutWriteEpoch`. */
  getWorkoutWriteEpoch(): number {
    return workoutWriteEpoch;
  },

  async put<T extends { id?: string }>(
    storeName: keyof StoreConfig,
    data: T,
  ): Promise<void> {
    if (storeName === "workouts" || storeName === "activeWorkout") {
      workoutWriteEpoch++;
    }
    const transaction = await openTx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async putMany<T extends { id?: string }>(
    storeName: keyof StoreConfig,
    items: T[],
  ): Promise<void> {
    const transaction = await openTx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      items.forEach((item) => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  },

  /**
   * Replaces the whole store in ONE transaction. A separate clear() + putMany()
   * could be interrupted (iOS kills the PWA, tab discarded) between the two
   * steps and leave the offline cache empty.
   */
  async replaceAll<T extends { id?: string }>(
    storeName: keyof StoreConfig,
    items: T[],
  ): Promise<void> {
    const transaction = await openTx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      store.clear();
      items.forEach((item) => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  },

  async delete(storeName: keyof StoreConfig, key: string): Promise<void> {
    if (storeName === "workouts" || storeName === "activeWorkout") {
      workoutWriteEpoch++;
    }
    const transaction = await openTx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async clear(storeName: keyof StoreConfig): Promise<void> {
    const transaction = await openTx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  // Pending sync operations
  async addPendingSync(operation: Omit<SyncOperation, "id">): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: SyncOperation = { ...operation, id };
    await this.put("pendingSync", fullOperation as unknown as { id: string });
    return id;
  },

  async updatePendingSync(operation: SyncOperation): Promise<void> {
    await this.put("pendingSync", operation as unknown as { id: string });
  },

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    return this.getAll<SyncOperation>("pendingSync");
  },

  async removePendingSync(id: string): Promise<void> {
    await this.delete("pendingSync", id);
  },

  // Metadata operations
  async getLastSync(): Promise<number> {
    const meta = await this.get<{ key: string; lastSync: number }>(
      "metadata",
      "sync",
    );
    return meta?.lastSync || 0;
  },

  async setLastSync(timestamp: number): Promise<void> {
    await this.put("metadata", {
      key: "sync",
      lastSync: timestamp,
    } as unknown as { id: string });
  },

  async getMetadata<T>(key: string): Promise<T | null> {
    const meta = await this.get<{ key: string; value: T }>("metadata", key);
    return meta?.value ?? null;
  },

  async setMetadata<T>(key: string, value: T): Promise<void> {
    await this.put("metadata", {
      key,
      value,
    } as unknown as { id: string });
  },

  // Trwałe mapowanie tymczasowych ID (temp_*) na prawdziwe ID z serwera.
  // Musi przeżyć przeładowanie strony i kolejne przebiegi synchronizacji,
  // inaczej operacje-dzieci (np. zapis serii) odwołujące się do temp-ID
  // rodzica nigdy się nie rozwiążą i dane przepadają po cichu.
  async getIdMappings(): Promise<Record<string, string>> {
    return (await this.getMetadata<Record<string, string>>("idMappings")) ?? {};
  },

  async addIdMappings(entries: Record<string, string>): Promise<void> {
    const keys = Object.keys(entries);
    if (keys.length === 0) return;
    const current = await this.getIdMappings();
    await this.setMetadata("idMappings", { ...current, ...entries });
  },

  // Active workout helper
  async getActiveWorkoutId(): Promise<string | null> {
    const data = await this.get<{ key: string; workoutId: string | null }>(
      "activeWorkout",
      "current",
    );
    return data?.workoutId || null;
  },

  async setActiveWorkoutId(workoutId: string | null): Promise<void> {
    await this.put("activeWorkout", {
      key: "current",
      workoutId,
    } as unknown as { id: string });
  },
};

/**
 * Ask the browser not to evict IndexedDB under storage pressure (Safari also
 * purges script-writable storage of sites unused for 7 days). Best effort.
 */
export const requestPersistentStorage = async (): Promise<void> => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported / denied - nothing to do
  }
};

export default localStore;
