# GymGate Frontend — Architektura offline-first

## Filozofia

Aplikacja działa na zasadzie **local-first**: dane użytkownika w IndexedDB są zawsze źródłem prawdy dla UI. Serwer jest synchronizowany w tle — nigdy nie blokuje interakcji.

Dane dodane przez użytkownika offline **nigdy nie są nadpisywane** przez dane z serwera dopóki nie zostaną wysłane.

---

## Komponenty systemu

### 1. `localStore.ts` — IndexedDB

Wrapper na IndexedDB z 6 store'ami:

| Store | Klucz | Zawartość |
|---|---|---|
| `workouts` | `id` | Pełne obiekty Workout (z items i sets) |
| `exercises` | `id` | Obiekty Exercise |
| `stats` | `id` | ExerciseUserStats per ćwiczenie |
| `activeWorkout` | `"current"` | ID aktywnego treningu |
| `pendingSync` | `id` | Kolejka operacji do wysłania (SyncOperation[]) |
| `metadata` | `key` | Ostatni sync, statsOverview, cache progresji |

`SyncOperation` przechowuje: typ (`create/update/delete`), encję (`workout/workoutItem/set/exercise`), endpoint, metodę HTTP, dane, timestamp i licznik prób.

---

### 2. `syncManager.ts` — Menedżer synchronizacji

Singleton odpowiedzialny za:
- Śledzenie stanu online/offline (`window.addEventListener("online"/"offline")`)
- Wysyłanie kolejkowanych operacji do serwera
- Pobieranie świeżych danych z serwera po synchronizacji
- Emitowanie zdarzeń sukcesu i niepowodzenia synchronizacji

**Cykl pracy:**

```
syncManager.start()
  → syncNow() wywołany natychmiast
  → setInterval co 2 minuty

syncNow():
  1. processPendingOperations()  – wyślij kolejkę (FIFO po timestamp)
  2. fetchFreshData()            – pobierz świeże dane z serwera
  3. setLastSync(Date.now())     – zapisz timestamp do IndexedDB
  4. notify listeners            – powiadom DataContext o nowych danych
```

**Zdarzenie online:** `handleOnline` wywołuje `syncNow()` natychmiast po przywróceniu połączenia.

---

### 3. `DataContext.tsx` — Globalny store

Jedyna globalna warstwa stanu w aplikacji. Eksponuje:
- `workouts[]`, `exercises[]`, `stats[]`, `statsOverview`, `activeWorkoutId`
- Wszystkie akcje mutujące dane
- `isOnline`, `lastSync`, `failedSyncOperations`

---

## Wzorzec optymistycznej aktualizacji

Każda mutacja (dodanie serii, zmiana ciężaru, etc.) przebiega w stałym schemacie:

```
1. Natychmiastowa aktualizacja React state (UI reaguje w <1ms)
2. Zapis do IndexedDB (persistencja offline)
3. Próba wywołania API:
   a) Sukces online  → remap temp IDs na prawdziwe, zaktualizuj IDB
   b) Błąd offline   → dodaj do kolejki pendingSync
   c) Błąd serwera   → rollback (przywróć poprzedni stan)
```

Użytkownik nigdy nie czeka. W razie awarii serwera dane wracają do stanu sprzed akcji.

---

## Tymczasowe ID i ich rozwiązywanie

Gdy encja jest tworzona offline, dostaje prefiks `temp_`:
- `temp_workout_1749219600000`
- `temp_item_1749219600001`
- `temp_set_1749219600002`

Te ID trafiają do `pendingSync` w endpoint-ach i payloadach kolejkowanych operacji.

**Rozwiązywanie przy synchronizacji** (`processPendingOperations`):

```
Operacje sortowane po timestamp → przetwarzane FIFO

Dla każdej operacji:
  resolvedEndpoint = replaceTempIds(op.endpoint, tempIdMap)
  resolvedData     = replaceTempIdsDeep(op.data, tempIdMap)

  Jeśli unresolved temp IDs → skip (zależność jeszcze nie rozwiązana)

  Po sukcesie API:
    tempIdMap.set(clientTempId, response.data.id)
    tempIdMap.set(clientTempItemId, response.data.id)
    tempIdMap.set(clientTempSetId, response.data.sets[0].id)
```

`tempIdMap` jest budowany progresywnie w ramach jednego wywołania `processPendingOperations`. Kolejne operacje w tej samej sesji synchronizacji mogą korzystać z mapowań poprzednich.

Równolegle — gdy akcja wywoływana jest online — `DataContext.idMappingRef` mapuje temp ID na prawdziwe ID w pamięci React (dla bieżącej sesji bez restartu).

---

## Ochrona danych offline przy odświeżeniu strony

### Problem

Gdy użytkownik:
1. Tworzy trening offline → `temp_workout_xxx` trafia do IndexedDB
2. Odświeża stronę przy aktywnym połączeniu

Bez ochrony: `fetchAllFromServer` wywołuje `localStore.clear("workouts")` zanim SyncManager wyśle pending ops → temp workout znika z IndexedDB.

### Rozwiązanie (Fix A)

`fetchAllFromServer` przed wyczyszczeniem IndexedDB sprawdza kolejkę:

```typescript
const pendingOps = await localStore.getPendingSyncOperations();
const hasPendingWorkoutMutations = pendingOps.some(
  (op) => op.entity === "workout" || op.entity === "workoutItem" || op.entity === "set"
);

// Jeśli są pending ops → pomiń pobieranie/czyszczenie workoutów
// Exercises, stats i statsOverview są zawsze odświeżane (bezpieczne)
```

To samo zachowanie ma `fetchFreshData` w SyncManager — Fix A powiela ten guard do `fetchAllFromServer`.

---

## Sekwencja startowa aplikacji

```
użytkownik zalogowany → useEffect:

1. loadLocalData():
   - Odczyt z IndexedDB (workouts, exercises, stats, etc.)
   - Ustawienie React state natychmiast → UI dostępne bez sieci
   - initialLoadDone.current = true
   - Jeśli data stale (>5 min) lub pusta → fetchAllFromServer()
     (z guardem pending ops — nie nadpisuje danych offline)

2. Rejestracja sync listener:
   - Listener sprawdza `initialLoadDone.current` → nie odpala przed etapem 1

3. syncManager.start():
   - syncNow() natychmiast:
     a) processPendingOperations() — wysyła kolejkę
     b) fetchFreshData()           — pobiera świeże dane
     c) listener fires             — aktualizuje React state z IndexedDB
```

**Dlaczego listener sprawdza `initialLoadDone.current`?** (Fix C)

Oba `useEffect`-y startują razem. SyncManager startuje asynchronicznie i jego listener mógłby zaktualizować state z IndexedDB zanim `loadLocalData` ustawi `initialLoadDone.current`, powodując nadpisanie świeżo załadowanych danych danymi z poprzedniego cyklu.

---

## Powiadomienie o utracie danych

Jeśli operacja z kolejki przekroczy 3 próby (`MAX_RETRIES = 3`), SyncManager:
1. Usuwa ją z `pendingSync`
2. Wywołuje `onSyncFailure` callbacks z listą nieudanych operacji

`DataContext` subskrybuje te zdarzenia i ustawia `failedSyncOperations[]`.

UI (`App.tsx`) renderuje baner informacyjny gdy `failedSyncOperations.length > 0`. Użytkownik może go zamknąć przez `dismissSyncFailures()`.

---

## Przepływ po przywróceniu połączenia

```
window: "online" event
  → SyncManager.handleOnline()
  → syncNow():
      processPendingOperations() → wyślij kolejkę FIFO
        ↓ sukces każdej op → tempIdMap budowany progresywnie
      fetchFreshData():
        jeśli brak pending ops → pobierz workouty z serwera
        (dane serwera mają teraz prawdziwe ID zamiast temp_*)
      listeners → aktualizuj React state z IndexedDB
```

---

## Stany aplikacji dla danych

| Stan | IndexedDB | React state | Serwer |
|---|---|---|---|
| Online, świeże dane | = serwer | = IndexedDB | ✓ |
| Online, pending ops | = serwer + optymistycznie | = IndexedDB | oczekuje |
| Offline, nowe dane | = optymistycznie | = IndexedDB | nie wysłano |
| Restart po offline | = optymistycznie | = IndexedDB | nie wysłano |
| Powrót online | serwer + optymistycznie | via listener | ✓ po sync |

---

## Struktura plików

```
frontend/src/
  utils/
    localStore.ts    – IndexedDB CRUD + pendingSync + metadata
    syncManager.ts   – background sync, kolejkowanie, failure callbacks
    auth.ts          – authFetch (auto-JWT), getAuthHeaders
  contexts/
    DataContext.tsx  – globalny store, optymistyczne aktualizacje, rollback
    AuthContext.tsx  – sesja, login, logout
  hooks/
    useWorkout.ts    – hook dla WorkoutDetailScreen
    useWorkouts.ts   – hook dla listy treningów
    useExercises.ts  – hook dla listy ćwiczeń
```
