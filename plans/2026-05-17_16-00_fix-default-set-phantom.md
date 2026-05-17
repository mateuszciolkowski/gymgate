# Fix: phantom default set powodujący błędne statystyki (#63, #64)

## Problem

Backend w `addExerciseToWorkout` zawsze persystuje domyślną serię (`lastWeight × lastReps`) gdy użytkownik dodaje ćwiczenie do treningu. Jeśli użytkownik dodaje kolejne serie bez edytowania tej pierwszej, ukończony trening ma o jedną serię za dużo — stąd "4 serie zamiast 3" (#64). Ta sama domyślna seria zaburza `ExerciseUserStats.lastWeight/lastReps` jeśli trening z niekompletną domyślną serią ma nowszą datę (#63).

## Root cause

`workout.service.ts:177`: `addSetToWorkoutItem(item.id, defaultWeight, defaultReps, 1)` — persystuje serię bez potwierdzenia użytkownika.

## Fix

Przenieść odpowiedzialność za tworzenie pierwszej serii na użytkownika (jak dla kolejnych serii — `draftSet`):

- Backend nie tworzy już domyślnej serii
- Frontend nie tworzy optymistycznej serii
- `WorkoutItemCard` auto-otwiera `draftSet` gdy `sets.length === 0`, pre-wypełniony `stats.lastWeight/lastReps`

## Zmienione pliki (4)

### 1. `backend/src/modules/workout/workout.service.ts`
- Usuń blok `defaultWeight/defaultReps` (linie 166-177)
- Usuń `addSetToWorkoutItem(...)` call

### 2. `backend/src/modules/workout/workout.service.test.ts`
- Aktualizuj test `addExerciseToWorkout`: usuń oczekiwanie `addSetToWorkoutItem`
- Zmień nazwę testu

### 3. `frontend/src/contexts/DataContext.tsx`
- Usuń `tempSetId`, `exerciseStat`, `defaultWeight`, `defaultReps`
- Zmień `sets: [{ ... }]` → `sets: []` w optimistic update
- Usuń `clientTempSetId` z `syncPayload`
- Uprość remap: tylko mapowanie ID item, bez sets

### 4. `frontend/src/components/screens/WorkoutDetailScreen.tsx` (WorkoutItemCard)
- Auto-inicjalizuj `draftSet` gdy `item.sets.length === 0 && canEdit`
- Zaktualizuj "Dodaj serię" button — fallback do `stats` gdy brak `lastSet`

## Szacunek zmian
~50 linii (w granicach progu)
