# Naprawa: trening-duch po resecie bazy serwera

## Problem

Użytkownik widzi na telefonie aktywny trening, którego nie można zakończyć — komunikat „Nie udało się zakończyć treningu". Tego treningu nie ma na stronie / na serwerze.

**Przyczyna:**

1. Trening został utworzony normalnie (ma „prawdziwy" UUID, nie `temp_`).
2. Na serwerze została wykonana operacja kasująca dane (reset / migracja / czyszczenie).
3. W IndexedDB telefonu zostaje rekord wskazujący na nieistniejący już zasób.
4. `PATCH /api/workouts/:id` zwraca 404.
5. W `frontend/src/contexts/DataContext.tsx:557` 404 jest traktowany jak każdy inny błąd (`throw new Error("Błąd aktualizacji treningu")`) — UI w `WorkoutDetailScreen.tsx:263` pokazuje generyczny alert.

**Dlaczego duch nie znika sam:**

`syncManager.fetchFreshData` (`frontend/src/utils/syncManager.ts:316-327`) pomija pobranie listy `/api/workouts` i `/api/workouts/active`, gdy istnieje JAKAKOLWIEK pending op typu `workout` / `workoutItem` / `set`. Jeden zakleszczony op blokuje refresh w nieskończoność. Te same ścieżki w `DataContext.tsx:264-345` (`fetchAllFromServer`) działają identycznie.

## Decyzja użytkownika

Wariant D: **A + C łącznie**
- A) Auto-cleanup: gdy serwer odpowiada 404 dla treningu → frontend usuwa go lokalnie + pokazuje toast / alert, nie zostawia ducha.
- C) Manualny „Resetuj cache" w menu jako escape hatch dla wszelkich innych anomalii cache vs serwer.

Brak `isOrphaned`, brak banerów, brak skomplikowanego UI. Brak self-healing po stronie offline backupów (świadomie pomijamy).

## Zakres zmian

### A) Auto-cleanup po 404

**`frontend/src/contexts/DataContext.tsx`**

1. Dodać klasę `WorkoutNotFoundError extends Error` (eksport).
2. Dodać helper `purgeLocalWorkout(workoutId: string)`:
   - usuwa rekord z `workouts` state,
   - usuwa z `localStore.workouts` (`localStore.delete("workouts", id)`),
   - kasuje wpisy z `pendingSync` referujące do tego workoutId (rozszerzyć logikę z `removePendingOperationsReferencingTempId` na realne ID),
   - jeśli `activeWorkoutId === id` → ustaw `null` (stan + IndexedDB),
   - jeśli `idMappingRef` zawiera mapowanie temp → ten id, też usunąć.
3. W `updateWorkout` (linie 539-605): po `response` jeśli `response.status === 404`:
   - `await purgeLocalWorkout(realWorkoutId)`,
   - `alert("Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.")`,
   - `throw new WorkoutNotFoundError(...)` — żeby caller wiedział że nie ma sensu kontynuować.
4. To samo dla pozostałych operacji workout-scope (gdzie 404 oznacza brak workoutu/itemu):
   - `addExerciseToWorkout`,
   - `removeExerciseFromWorkout`,
   - `updateWorkoutItem`,
   - `addSet`, `updateSet`, `deleteSet`,
   - `deleteWorkout` (404 = już nie ma → traktuj jako sukces + purge).
5. `getWorkout` (refresh) jeśli 404 → purge.

**`frontend/src/utils/syncManager.ts`**

6. W `processPendingOperations` (linie 194-269): jeśli `response.status === 404` dla op związanego z workoutem/itemem/setem:
   - terminalnie: `await localStore.removePendingSync(op.id)`,
   - nie zwiększaj `retries`,
   - dodaj op do `permanentlyFailed` z markerem (rozszerzyć `SyncFailureCallback`/`SyncOperation` o opcjonalne `failureReason: "not_found"`),
   - nowy callback: `onWorkoutNotFound(workoutId)` → DataContext subskrybuje i woła `purgeLocalWorkout`.
7. Drugorzędne: w `fetchFreshData` rozważyć refresh listy `/api/workouts` i `/api/workouts/active` ZAWSZE (nie blokować przez `hasPendingWorkoutMutations`). Jeśli pending op tyczy się treningu X, to przy nadpisaniu możemy go zachować lokalnie (merge). **Decyzja:** odłożyć — niski priorytet, A) już rozwiązuje główny case.

**`frontend/src/components/screens/WorkoutDetailScreen.tsx`**

8. W `handleCompleteWorkout`, `handleSaveWorkout`, `handleSaveNotes`, `handleDeleteWorkout`, etc.: `catch (e)` → jeśli `e instanceof WorkoutNotFoundError` → tylko `onBack()` (alert wyświetli się raz, z `purgeLocalWorkout`); inne błędy → istniejące generyczne alerty.

### C) „Resetuj cache" w menu

**`frontend/src/contexts/DataContext.tsx`**

9. Dodać akcję `resetLocalCache()`:
   - `localStore.clear("workouts")`,
   - `localStore.clear("exercises")`,
   - `localStore.clear("stats")`,
   - `localStore.clear("activeWorkout")`,
   - `localStore.clear("pendingSync")`,
   - `localStore.clear("metadata")`,
   - czyszczę `idMappingRef`, `progressionCacheRef`,
   - state reset (`setWorkouts([])`, `setExercises([])`, `setStats([])`, `setStatsOverview(null)`, `setActiveWorkoutId(null)`, `setFailedSyncOperations([])`),
   - `await fetchAllFromServer()`.
10. Eksport w `DataContextType` + value/useMemo.

**`frontend/src/components/screens/MenuScreen.tsx`**

11. Nowa pozycja menu „Resetuj lokalny cache" (po „Eksportuj dane"):
    - ikonka odświeżania,
    - desc: „Wyczyść dane offline i pobierz od nowa",
    - onClick → `confirm("Wyczyścić wszystkie dane zapisane lokalnie i pobrać od nowa z serwera? Niezsynchronizowane zmiany mogą zostać utracone.")` → jeśli OK → `await resetLocalCache()` → `alert("Cache wyczyszczony, dane pobrane z serwera.")`.

## Czego NIE robię

- nie ruszam backendu,
- nie dodaję `isOrphaned`, banerów ani recovery offline,
- nie zmieniam logiki `temp_id`,
- nie automatyzuję full-cache-resetu (`resetLocalCache` zawsze za zgodą użytkownika).

## Plik-po-pliku — checklist

- [ ] `frontend/src/contexts/DataContext.tsx` — `WorkoutNotFoundError`, `purgeLocalWorkout`, `resetLocalCache`, 404-handling w workoutowych akcjach
- [ ] `frontend/src/utils/syncManager.ts` — 404 terminal + `onWorkoutNotFound`
- [ ] `frontend/src/components/screens/WorkoutDetailScreen.tsx` — `WorkoutNotFoundError` w catch
- [ ] `frontend/src/components/screens/MenuScreen.tsx` — pozycja „Resetuj lokalny cache"

## Test po wdrożeniu

1. Bieżący duch: wejdź w detal treningu na telefonie → kliknij „Zakończ" → zobaczysz alert „Ten trening nie istnieje już na serwerze — został usunięty z urządzenia." + ekran wraca do listy → trening znika.
2. Manualny reset: Menu → „Resetuj lokalny cache" → potwierdź → cache pusty, lista pobrana z serwera.
3. Sanity: nowy trening tworzony online działa normalnie, offline (Airplane Mode) też kolejkuje jak wcześniej.
