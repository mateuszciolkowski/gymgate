/**
 * LocalStore - IndexedDB based offline-first storage
 * Umożliwia pracę offline i szybkie działanie aplikacji
 */

const DB_NAME = "gymgate_db";
const DB_VERSION = 1;

interface StoreConfig {
  exercises: { key: string; data: unknown };
  workouts: { key: string; data: unknown };
  activeWorkout: { key: string; data: unknown };
  stats: { key: string; data: unknown };
  pendingSync: { key: string; data: SyncOperation };
  metadata: { key: string; data: { lastSync: number } };
}

export interface SyncOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "workout" | "exercise" | "set" | "workoutItem";
  endpoint: string;
  method: string;
  data?: unknown;
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

      // Store dla ćwiczeń
      if (!database.objectStoreNames.contains("exercises")) {
        database.createObjectStore("exercises", { keyPath: "id" });
      }

      // Store dla treningów
      if (!database.objectStoreNames.contains("workouts")) {
        database.createObjectStore("workouts", { keyPath: "id" });
      }

      // Store dla aktywnego treningu
      if (!database.objectStoreNames.contains("activeWorkout")) {
        database.createObjectStore("activeWorkout", { keyPath: "key" });
      }

      // Store dla statystyk
      if (!database.objectStoreNames.contains("stats")) {
        database.createObjectStore("stats", { keyPath: "id" });
      }

      // Store dla operacji do synchronizacji
      if (!database.objectStoreNames.contains("pendingSync")) {
        const store = database.createObjectStore("pendingSync", {
          keyPath: "id",
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Store dla metadanych (ostatnia synchronizacja itd.)
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
    data: T
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
    items: T[]
  ): Promise<void> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = items.length;

      if (total === 0) {
        resolve();
        return;
      }

      items.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
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
      "sync"
    );
    return meta?.lastSync || 0;
  },

  async setLastSync(timestamp: number): Promise<void> {
    await this.put("metadata", { key: "sync", lastSync: timestamp } as unknown as { id: string });
  },

  // Active workout helper
  async getActiveWorkoutId(): Promise<string | null> {
    const data = await this.get<{ key: string; workoutId: string | null }>(
      "activeWorkout",
      "current"
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
