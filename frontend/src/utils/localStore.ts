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
}

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
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

// Generic CRUD operations
export const localStore = {
  async get<T>(storeName: keyof StoreConfig, key: string): Promise<T | null> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async getAll<T>(storeName: keyof StoreConfig): Promise<T[]> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  async put<T extends { id?: string }>(
    storeName: keyof StoreConfig,
    data: T,
  ): Promise<void> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
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
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      items.forEach((item) => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async delete(storeName: keyof StoreConfig, key: string): Promise<void> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async clear(storeName: keyof StoreConfig): Promise<void> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
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

export default localStore;
