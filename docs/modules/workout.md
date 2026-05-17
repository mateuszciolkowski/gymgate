# Moduł: Workout

## Odpowiedzialność

Zarządzanie treningami (Workout), pozycjami ćwiczeń w treningu (WorkoutItem), seriami (WorkoutSet) oraz statystykami per ćwiczenie (ExerciseUserStats).

## Modele domenowe

```
Workout  (status: DRAFT | COMPLETED)
  └─ WorkoutItem[]   (ćwiczenie wewnątrz treningu)
       └─ WorkoutSet[]  (seria: weight, repetitions)

ExerciseUserStats   (cache statystyk, UNIQUE userId+exerciseId)
ExercisePendingNote (tabela przejściowa dla notatek, UNIQUE userId+exerciseId)
```

## Endpointy (wszystkie wymagają authMiddleware)

### Workouty

| Metoda | Ścieżka                | Opis                                                  |
| ------ | ---------------------- | ----------------------------------------------------- |
| POST   | `/api/workouts`        | Utwórz nowy trening (status: DRAFT); opcjonalnie `workoutPlanId` |
| GET    | `/api/workouts`        | Lista treningów użytkownika (paginacja, filtr status) |
| GET    | `/api/workouts/active` | Aktywny trening użytkownika                           |
| DELETE | `/api/workouts/active` | Wyczyść wskaźnik aktywnego treningu                   |
| GET    | `/api/workouts/:id`    | Trening z items + sets + exercise                     |
| PATCH  | `/api/workouts/:id`    | Edytuj / zamknij trening (`status: COMPLETED`)        |
| DELETE | `/api/workouts/:id`    | Usuń trening (cascade: items → sets, rebuild stats)   |

### Pozycje (WorkoutItem)

| Metoda | Ścieżka                              | Opis                        |
| ------ | ------------------------------------ | --------------------------- |
| POST   | `/api/workouts/:workoutId/exercises` | Dodaj ćwiczenie do treningu |
| PATCH  | `/api/workouts/items/:itemId`        | Edytuj notatki / kolejność  |
| DELETE | `/api/workouts/items/:itemId`        | Usuń ćwiczenie z treningu   |

### Serie (WorkoutSet)

| Metoda | Ścieżka                            | Opis         |
| ------ | ---------------------------------- | ------------ |
| POST   | `/api/workouts/items/:itemId/sets` | Dodaj serię  |
| PATCH  | `/api/workouts/sets/:setId`        | Edytuj serię |
| DELETE | `/api/workouts/sets/:setId`        | Usuń serię   |

### Statystyki

| Metoda | Ścieżka                                       | Opis                                       |
| ------ | --------------------------------------------- | ------------------------------------------ |
| GET    | `/api/workouts/stats/all`                     | Wszystkie ExerciseUserStats użytkownika    |
| GET    | `/api/workouts/stats/exercise/:exerciseId`    | Stats dla konkretnego ćwiczenia            |
| GET    | `/api/workouts/stats/overview`                | Globalny przegląd (totalWorkouts, records) |
| GET    | `/api/workouts/stats/progression/:exerciseId` | Historyczna progresja ćwiczenia            |

## Kluczowe przepływy

### Dodanie ćwiczenia do treningu

```
POST /api/workouts/:workoutId/exercises
  ↓ addExerciseToWorkoutWithPendingNote() – transakcja:
      1. Pobierz ExercisePendingNote dla (userId, exerciseId)
      2. Utwórz WorkoutItem z previousNote = pending?.note
      3. Usuń ExercisePendingNote
  ↓ (jeśli workout.status === "COMPLETED") rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId)
  ↓ 201 { data: WorkoutItem z sets: [] }
```

Po stronie frontendu (`DataContext`) stosowany jest optimistic update: item tworzony jest z `temp_*` ID i **pustą listą serii** (`sets: []`). Pierwsza seria jest wyłącznie po stronie frontendu — jako `draftSet` w `WorkoutItemCard`, pre-wypełniony wartościami `ExerciseUserStats.lastWeight/lastReps`. Serwer nie tworzy domyślnej serii — eliminuje to problem "phantom default set" w historii ćwiczenia.

### Zamknięcie treningu

```
PATCH /api/workouts/:id  { status: "COMPLETED" }
  ↓ workoutService.updateWorkout()
      └─ rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseIds)
           ← agreguje wszystkie COMPLETED workouty, nadpisuje ExerciseUserStats
```

> **Ważne:** Statystyki są zawsze **przebudowywane w całości** (nie inkrementalnie). Ta sama funkcja wywoływana jest również przy:
>
> - usunięciu treningu
> - edycji lub usunięciu serii w `COMPLETED` treningu
> - edycji notatki `WorkoutItem` w `COMPLETED` treningu
> - dodaniu ćwiczenia do już `COMPLETED` treningu

### Mechanizm notatek (carry-over)

```
WorkoutItem.notes        – notatka do bieżącego treningu
WorkoutItem.previousNote – notatka z poprzedniego treningu (one-time, skonsumowana przy dodaniu)
ExercisePendingNote      – staging: upsertowana przy każdej zmianie notes,
                           usuwana gdy ćwiczenie jest dodawane do treningu
```

## Integracja z planem

Workout może być powiązany z `WorkoutPlan` przez `workoutPlanId`. Trening startuje pusty — plan jest referencją live (nie snapshotem). Szczegółowy opis modułu planów → [`plan.md`](./plan.md).

### Nowe pola w Workout

| Pole | Typ | Opis |
|---|---|---|
| `workoutPlanId` | `String?` | FK do `WorkoutPlan`; `SET NULL` przy usunięciu planu |
| `skippedPlanExerciseIds` | `String[]` | Ćwiczenia pominięte w tym konkretnym treningu |

### Endpointy integracji

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/workouts/:id/next-from-plan` | Pierwsze nieukończone ćwiczenie z planu |
| POST | `/api/workouts/:id/skip-plan-exercise` | Dodaj exerciseId do skippedPlanExerciseIds (idempotentne) |

### Algorytm `nextFromPlan` (backend + frontend)

```
plan.items
  .sort(orderInPlan asc)
  .filter(item => !workout.items.some(i => i.exerciseId === item.exerciseId))
  .filter(item => !workout.skippedPlanExerciseIds.includes(item.exerciseId))
  .first() || null
```

Frontend wylicza `nextFromPlan` **lokalnie** z `DataContext.plans` bez dodatkowego requestu — reaguje live na zmiany planu w trakcie trwającego treningu. Backend endpoint `/next-from-plan` istnieje dla innych klientów.

### Przepływ suggest / skip (frontend)

```
WorkoutDetailScreen (DRAFT + workoutPlanId != null):
  1. activePlan = plans.find(p.id === workout.workoutPlanId)
  2. nextFromPlan = algorytm powyżej (useMemo, live)
  3a. Klik [+ <ćwiczenie>] → addExercise(nextFromPlan.exerciseId)
       ← reuse istniejącego endpointu POST /api/workouts/:id/exercises
       ← gwarantuje: previousNote + defaultSet z stats
  3b. Klik [⏭] → skipPlanExercise(workoutId, exerciseId)
       ← optimistic: dodaje do skippedPlanExerciseIds w state + IndexedDB
       ← POST /api/workouts/:id/skip-plan-exercise
       ← rollback (state + IndexedDB) na błąd API
  4. Brak nextFromPlan → "Plan ukończony"
  5. Manualny ExerciseSelectionModal działa równolegle bez zmian
```

## Zapis rekordu osobistego

Rekord (PR) = najwyższy `weight` kiedykolwiek podniesiony dla danego ćwiczenia przez danego użytkownika (`maxWeight`). `maxWeightReps` to kontekst dla tego rekordu, nie osobna metryka rankingowa.

## Pliki

```
backend/src/modules/workout/
  workout.routes.ts
  workout.controller.ts
  workout.service.ts      ← rebuildExerciseStats, addExerciseToWorkoutWithPendingNote
  workout.repository.ts
  workout.schema.ts       ← Zod schemas
  API.md                  ← szczegółowe req/res kontrakty
```
