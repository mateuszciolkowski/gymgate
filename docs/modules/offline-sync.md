# Module: Offline / Sync

## Responsibility

Ensures the application works without a network connection and synchronizes local changes with the server once connectivity is restored.

## Architecture

```
DataContext (React)
  │
  ├─ authFetch()         ← every API request goes through authFetch
  │    └─ on 401 → clearStorage + reload
  │
  ├─ isOfflineError()    ← TypeError or !navigator.onLine
  │
  ├─ queueSyncOperation()  ← saves operation to IndexedDB (pendingSync store)
  │
  └─ SyncManager (singleton)
       ├─ start()         ← called when DataProvider mounts
       ├─ syncNow()       ← called: on start, every 2 min, on reconnect
       ├─ processPendingOperations()
       └─ fetchFreshData()
```

## localStore – IndexedDB

File: `frontend/src/utils/localStore.ts`

Database: `gymgate_db` (v1), 6 object stores:

| Store           | keyPath | Contents                                        |
| --------------- | ------- | ----------------------------------------------- |
| `exercises`     | `id`    | Exercise[]                                      |
| `workouts`      | `id`    | Workout[] (with items and sets)                 |
| `activeWorkout` | `key`   | `{ key: "current", workoutId: string\|null }`   |
| `stats`         | `id`    | ExerciseUserStats[]                             |
| `pendingSync`   | `id`    | SyncOperation[] (with timestamp index)          |
| `metadata`      | `key`   | lastSync, statsOverview, statsProgression cache |

## SyncOperation

```typescript
interface SyncOperation {
  id: string; // "sync_<timestamp>_<random>"
  type: "create" | "update" | "delete";
  entity: "workout" | "exercise" | "set" | "workoutItem";
  endpoint: string; // e.g. "/api/workouts/temp_workout_abc/exercises"
  method: string; // "POST" | "PATCH" | "DELETE"
  data?: unknown;
  timestamp: number;
  retries: number; // max 3, after exceeding → permanently failed
}
```

## Sync Flow

```
syncNow()
  1. processPendingOperations()
     ├─ sort by timestamp (FIFO)
     ├─ for each operation:
     │   ├─ replace temp_* IDs with real ones (tempIdMap from previous responses)
     │   ├─ check if all temp IDs are resolved → skip if not
     │   ├─ send request (authFetch)
     │   ├─ success → remove from pendingSync, save temp→real ID mapping
     │   └─ error → retries++; if >= 3 → permanentlyFailed[]
     └─ notify failureListeners if there are permanently failed ops

  2. fetchFreshData()
     ├─ GET /api/workouts, /api/exercises, /api/workouts/stats/all,
     │   /api/workouts/stats/overview
     └─ overwrite IndexedDB with fresh data

  3. setLastSync(Date.now())
  4. notify listeners (DataContext refreshes state)
```

## Optimistic Update Pattern

Every mutation in `DataContext` performs:

```
1. setState(...)           ← immediate UI update
2. localStore.put(...)     ← save to IndexedDB
3. authFetch(...)          ← request to API
   ├─ success → idMapping: temp_* → real UUID
   └─ isOfflineError → queueSyncOperation(...)  ← add to queue
       └─ rollback setState() if server error (not offline)
```

## Temporary IDs (temp IDs)

When offline, entities are created with IDs in the format `temp_<entity>_<randomhex>`, e.g. `temp_workout_a1b2c3`.

`SyncManager` during operation replay replaces all `temp_*` in `endpoint` and `data` with real UUIDs from `tempIdMap`. Operations with unresolved temp IDs are skipped until the next sync round.

## Sync Failure Handling (UI)

The `SyncFailureBanner` component (`components/app/SyncFailureBanner.tsx`) is displayed when `failedSyncOperations.length > 0`. Available actions:

- **Retry** – calls `syncNow()`
- **Dismiss** – calls `dismissSyncFailures()` (only hides UI, does not remove operations)

## Sync Interval

`SYNC_INTERVAL = 2 * 60 * 1000` (2 minutes). `syncNow()` is also called immediately on the `window online` event.

## Files

```
frontend/src/utils/
  localStore.ts    ← IndexedDB wrapper
  syncManager.ts   ← SyncManager class (singleton export)
  auth.ts          ← authFetch, getAuthHeaders
frontend/src/contexts/
  DataContext.tsx  ← DataProvider, queueSyncOperation, optimistic updates
frontend/docs/
  OFFLINE.md       ← additional notes on offline mode
```
