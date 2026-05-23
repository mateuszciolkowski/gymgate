# GymGate Frontend — Offline-first Architecture

## Philosophy

The application operates on a **local-first** principle: user data in IndexedDB is always the source of truth for the UI. The server is synchronized in the background — it never blocks interaction.

Data added by the user offline **is never overwritten** by server data until it has been sent.

---

## System Components

### 1. `localStore.ts` — IndexedDB

Wrapper around IndexedDB with 6 stores:

| Store | Key | Contents |
|---|---|---|
| `workouts` | `id` | Full Workout objects (with items and sets) |
| `exercises` | `id` | Exercise objects |
| `stats` | `id` | ExerciseUserStats per exercise |
| `activeWorkout` | `"current"` | Active workout ID |
| `pendingSync` | `id` | Queue of operations to send (SyncOperation[]) |
| `metadata` | `key` | Last sync, statsOverview, progression cache |

`SyncOperation` stores: type (`create/update/delete`), entity (`workout/workoutItem/set/exercise`), endpoint, HTTP method, data, timestamp, and retry count.

---

### 2. `syncManager.ts` — Sync Manager

Singleton responsible for:
- Tracking online/offline state (`window.addEventListener("online"/"offline")`)
- Sending queued operations to the server
- Fetching fresh data from the server after synchronization
- Emitting sync success and failure events

**Work cycle:**

```
syncManager.start()
  → syncNow() called immediately
  → setInterval every 2 minutes

syncNow():
  1. processPendingOperations()  – send queue (FIFO by timestamp)
  2. fetchFreshData()            – fetch fresh data from server
  3. setLastSync(Date.now())     – save timestamp to IndexedDB
  4. notify listeners            – notify DataContext of new data
```

**Online event:** `handleOnline` calls `syncNow()` immediately after connection is restored.

---

### 3. `DataContext.tsx` — Global Store

The only global state layer in the application. Exposes:
- `workouts[]`, `exercises[]`, `stats[]`, `statsOverview`, `activeWorkoutId`
- All data-mutating actions
- `isOnline`, `lastSync`, `failedSyncOperations`

---

## Optimistic Update Pattern

Every mutation (adding a set, changing weight, etc.) follows a fixed pattern:

```
1. Immediate React state update (UI responds in <1ms)
2. Save to IndexedDB (offline persistence)
3. Attempt API call:
   a) Online success  → remap temp IDs to real ones, update IDB
   b) Offline error   → add to pendingSync queue
   c) Server error    → rollback (restore previous state)
```

The user never waits. If the server fails, data reverts to the pre-action state.

---

## Temporary IDs and Resolution

When an entity is created offline, it gets a `temp_` prefix:
- `temp_workout_1749219600000`
- `temp_item_1749219600001`
- `temp_set_1749219600002`

These IDs end up in `pendingSync` in the endpoints and payloads of queued operations.

**Resolution during synchronization** (`processPendingOperations`):

```
Operations sorted by timestamp → processed FIFO

For each operation:
  resolvedEndpoint = replaceTempIds(op.endpoint, tempIdMap)
  resolvedData     = replaceTempIdsDeep(op.data, tempIdMap)

  If unresolved temp IDs → skip (dependency not yet resolved)

  After API success:
    tempIdMap.set(clientTempId, response.data.id)
    tempIdMap.set(clientTempItemId, response.data.id)
    tempIdMap.set(clientTempSetId, response.data.sets[0].id)
```

`tempIdMap` is built progressively within a single `processPendingOperations` call. Subsequent operations in the same sync session can use mappings from previous ones.

In parallel — when an action is called online — `DataContext.idMappingRef` maps temp IDs to real IDs in React memory (for the current session without restart).

---

## Protecting Offline Data on Page Refresh

### Problem

When the user:
1. Creates a workout offline → `temp_workout_xxx` goes to IndexedDB
2. Refreshes the page with an active connection

Without protection: `fetchAllFromServer` calls `localStore.clear("workouts")` before SyncManager sends pending ops → temp workout disappears from IndexedDB.

### Solution (Fix A)

`fetchAllFromServer` checks the queue before clearing IndexedDB:

```typescript
const pendingOps = await localStore.getPendingSyncOperations();
const hasPendingWorkoutMutations = pendingOps.some(
  (op) => op.entity === "workout" || op.entity === "workoutItem" || op.entity === "set"
);

// If there are pending ops → skip fetching/clearing workouts
// Exercises, stats, and statsOverview are always refreshed (safe)
```

The same behavior applies to `fetchFreshData` in SyncManager — Fix A replicates this guard to `fetchAllFromServer`.

---

## Application Startup Sequence

```
user logged in → useEffect:

1. loadLocalData():
   - Read from IndexedDB (workouts, exercises, stats, etc.)
   - Set React state immediately → UI available without network
   - initialLoadDone.current = true
   - If data stale (>5 min) or empty → fetchAllFromServer()
     (with pending ops guard — does not overwrite offline data)

2. Register sync listener:
   - Listener checks `initialLoadDone.current` → does not fire before step 1

3. syncManager.start():
   - syncNow() immediately:
     a) processPendingOperations() — sends queue
     b) fetchFreshData()           — fetches fresh data
     c) listener fires             — updates React state from IndexedDB
```

**Why does the listener check `initialLoadDone.current`?** (Fix C)

Both `useEffect`s start together. SyncManager starts asynchronously and its listener could update state from IndexedDB before `loadLocalData` sets `initialLoadDone.current`, causing freshly loaded data to be overwritten by data from the previous cycle.

---

## Data Loss Notification

If a queued operation exceeds 3 attempts (`MAX_RETRIES = 3`), SyncManager:
1. Removes it from `pendingSync`
2. Calls `onSyncFailure` callbacks with the list of failed operations

`DataContext` subscribes to these events and sets `failedSyncOperations[]`.

UI (`App.tsx`) renders an informational banner when `failedSyncOperations.length > 0`. The user can dismiss it via `dismissSyncFailures()`.

---

## Flow After Connection Restored

```
window: "online" event
  → SyncManager.handleOnline()
  → syncNow():
      processPendingOperations() → send queue FIFO
        ↓ success for each op → tempIdMap built progressively
      fetchFreshData():
        if no pending ops → fetch workouts from server
        (server data now has real IDs instead of temp_*)
      listeners → update React state from IndexedDB
```

---

## Application Data States

| State | IndexedDB | React state | Server |
|---|---|---|---|
| Online, fresh data | = server | = IndexedDB | ✓ |
| Online, pending ops | = server + optimistic | = IndexedDB | pending |
| Offline, new data | = optimistic | = IndexedDB | not sent |
| Restart after offline | = optimistic | = IndexedDB | not sent |
| Back online | server + optimistic | via listener | ✓ after sync |

---

## File Structure

```
frontend/src/
  utils/
    localStore.ts    – IndexedDB CRUD + pendingSync + metadata
    syncManager.ts   – background sync, queuing, failure callbacks
    auth.ts          – authFetch (auto-JWT), getAuthHeaders
  contexts/
    DataContext.tsx  – global store, optimistic updates, rollback
    AuthContext.tsx  – session, login, logout
  hooks/
    useWorkout.ts    – hook for WorkoutDetailScreen
    useWorkouts.ts   – hook for workout list
    useExercises.ts  – hook for exercise list
```
