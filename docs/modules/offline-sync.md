# Moduł: Offline / Sync

## Odpowiedzialność

Zapewnienie działania aplikacji przy braku połączenia z siecią oraz synchronizacja lokalnych zmian z serwerem po jego odzyskaniu.

## Architektura

```
DataContext (React)
  │
  ├─ authFetch()         ← każde żądanie API przechodzi przez authFetch
  │    └─ przy 401 → clearStorage + reload
  │
  ├─ isOfflineError()    ← TypeError lub !navigator.onLine
  │
  ├─ queueSyncOperation()  ← zapisuje operację do IndexedDB (pendingSync store)
  │
  └─ SyncManager (singleton)
       ├─ start()         ← wywołany przy montowaniu DataProvider
       ├─ syncNow()       ← wołany: przy starcie, co 2 min, po powrocie online
       ├─ processPendingOperations()
       └─ fetchFreshData()
```

## localStore – IndexedDB

Plik: `frontend/src/utils/localStore.ts`

Baza: `gymgate_db` (v1), 6 object stores:

| Store           | keyPath | Zawartość                                       |
| --------------- | ------- | ----------------------------------------------- |
| `exercises`     | `id`    | Exercise[]                                      |
| `workouts`      | `id`    | Workout[] (z items i sets)                      |
| `activeWorkout` | `key`   | `{ key: "current", workoutId: string\|null }`   |
| `stats`         | `id`    | ExerciseUserStats[]                             |
| `pendingSync`   | `id`    | SyncOperation[] (z indeksem na timestamp)       |
| `metadata`      | `key`   | lastSync, statsOverview, statsProgression cache |

## SyncOperation

```typescript
interface SyncOperation {
  id: string; // "sync_<timestamp>_<random>"
  type: "create" | "update" | "delete";
  entity: "workout" | "exercise" | "set" | "workoutItem";
  endpoint: string; // np. "/api/workouts/temp_workout_abc/exercises"
  method: string; // "POST" | "PATCH" | "DELETE"
  data?: unknown;
  timestamp: number;
  retries: number; // max 3, po przekroczeniu → permanentnie failed
}
```

## Przepływ synchronizacji

```
syncNow()
  1. processPendingOperations()
     ├─ sortuj po timestamp (FIFO)
     ├─ dla każdej operacji:
     │   ├─ zamień temp_* IDs na prawdziwe (tempIdMap z poprzednich odpowiedzi)
     │   ├─ sprawdź czy wszystkie temp IDs zostały rozwiązane → pomiń jeśli nie
     │   ├─ wyślij request (authFetch)
     │   ├─ sukces → usuń z pendingSync, zapisz mapowanie temp→real ID
     │   └─ błąd → retries++; jeśli >= 3 → permanentlyFailed[]
     └─ powiadom failureListeners jeśli są permanentnie nieudane

  2. fetchFreshData()
     ├─ GET /api/workouts, /api/exercises, /api/workouts/stats/all,
     │   /api/workouts/stats/overview
     └─ nadpisz IndexedDB świeżymi danymi

  3. setLastSync(Date.now())
  4. powiadom listeners (DataContext refreshuje stan)
```

## Optimistic Update Pattern

Każda mutacja w `DataContext` wykonuje:

```
1. setState(...)           ← natychmiastowy update UI
2. localStore.put(...)     ← zapis w IndexedDB
3. authFetch(...)          ← request do API
   ├─ sukces → idMapping: temp_* → real UUID
   └─ isOfflineError → queueSyncOperation(...)  ← dodaj do kolejki
       └─ rollback setState() jeśli błąd serwera (nie offline)
```

## Tymczasowe ID (temp IDs)

Przy braku połączenia encje tworzone są z ID w formacie `temp_<entity>_<randomhex>`, np. `temp_workout_a1b2c3`.

`SyncManager` podczas replaying operacji zastępuje wszystkie `temp_*` w `endpoint` i `data` prawdziwymi UUID z `tempIdMap`. Operacje z nierozwiązanymi temp IDs są pomijane do następnej rundy synchronizacji.

## Obsługa błędów synchronizacji (UI)

Komponent `SyncFailureBanner` (`App.tsx`) wyświetlany jest gdy `failedSyncOperations.length > 0`. Dostępne akcje:

- **Ponów** – wywołuje `syncNow()`
- **Zamknij** – wywołuje `dismissSyncFailures()` (tylko ukrywa UI, nie usuwa operacji)

## Interwał synchronizacji

`SYNC_INTERVAL = 2 * 60 * 1000` (2 minuty). `syncNow()` wywoływana jest również natychmiast przy zdarzeniu `window online`.

## Pliki

```
frontend/src/utils/
  localStore.ts    ← IndexedDB wrapper
  syncManager.ts   ← SyncManager class (singleton export)
  auth.ts          ← authFetch, getAuthHeaders
frontend/src/contexts/
  DataContext.tsx  ← DataProvider, queueSyncOperation, optimistic updates
frontend/docs/
  OFFLINE.md       ← dodatkowe notatki dot. trybu offline
```
