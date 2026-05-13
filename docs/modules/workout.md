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
| POST   | `/api/workouts`        | Utwórz nowy trening (status: DRAFT)                   |
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
  ↓ addSetToWorkoutItem(item.id, defaultWeight, defaultReps, 1)
       defaultWeight/defaultReps = lastWeight/lastReps z ExerciseUserStats (fallback: 0 kg / 1 rep)
  ↓ (jeśli workout.status === "COMPLETED") rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId)
  ↓ 201 { data: WorkoutItem z sets[] }
```

Po stronie frontendu (`DataContext`) stosowany jest optimistic update: item tworzony jest z `temp_*` ID i jedną serią zanim serwer odeprze odpowiedź.

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
