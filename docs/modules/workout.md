# Module: Workout

## Responsibility

Manages workouts (Workout), exercise items within a workout (WorkoutItem), sets (WorkoutSet), and per-exercise statistics (ExerciseUserStats).

## Domain Models

```
Workout  (status: DRAFT | COMPLETED)
  └─ WorkoutItem[]   (exercise within a workout)
       └─ WorkoutSet[]  (set: weight, repetitions)

ExerciseUserStats   (stats cache, UNIQUE userId+exerciseId)
ExercisePendingNote (transient table for notes, UNIQUE userId+exerciseId)
```

## Endpoints (all require authMiddleware)

### Workouts

| Method | Path                    | Description                                                   |
| ------ | ----------------------- | ------------------------------------------------------------- |
| POST   | `/api/workouts`         | Create new workout (status: DRAFT); optionally `workoutPlanId` |
| GET    | `/api/workouts`         | List user workouts (pagination, status filter)                |
| GET    | `/api/workouts/active`  | User's active workout                                         |
| DELETE | `/api/workouts/active`  | Clear active workout pointer                                  |
| GET    | `/api/workouts/:id`     | Workout with items + sets + exercise                          |
| PATCH  | `/api/workouts/:id`     | Edit / close workout (`status: COMPLETED`)                    |
| DELETE | `/api/workouts/:id`     | Delete workout (cascade: items → sets, rebuild stats)         |

### Items (WorkoutItem)

| Method | Path                                  | Description                 |
| ------ | ------------------------------------- | --------------------------- |
| POST   | `/api/workouts/:workoutId/exercises`  | Add exercise to workout     |
| PATCH  | `/api/workouts/items/:itemId`         | Edit notes / order          |
| DELETE | `/api/workouts/items/:itemId`         | Remove exercise from workout|

### Sets (WorkoutSet)

| Method | Path                                | Description  |
| ------ | ----------------------------------- | ------------ |
| POST   | `/api/workouts/items/:itemId/sets`  | Add set      |
| PATCH  | `/api/workouts/sets/:setId`         | Edit set     |
| DELETE | `/api/workouts/sets/:setId`         | Delete set   |

### Statistics

| Method | Path                                           | Description                                |
| ------ | ---------------------------------------------- | ------------------------------------------ |
| GET    | `/api/workouts/stats/all`                      | All ExerciseUserStats for the user         |
| GET    | `/api/workouts/stats/exercise/:exerciseId`     | Stats for a specific exercise              |
| GET    | `/api/workouts/stats/overview`                 | Global overview (totalWorkouts, records)   |
| GET    | `/api/workouts/stats/progression/:exerciseId`  | Historical exercise progression            |

## Key Flows

### Adding an Exercise to a Workout

```
POST /api/workouts/:workoutId/exercises
  ↓ addExerciseToWorkoutWithPendingNote() – transaction:
      1. Fetch ExercisePendingNote for (userId, exerciseId)
      2. Create WorkoutItem with previousNote = pending?.note
      3. Delete ExercisePendingNote
  ↓ (if workout.status === "COMPLETED") rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId)
  ↓ 201 { data: WorkoutItem with sets: [] }
```

On the frontend side (`DataContext`), an optimistic update is applied: the item is created with a `temp_*` ID and **an empty sets list** (`sets: []`). The first set exists only on the frontend — as a `draftSet` in `WorkoutItemCard`, pre-filled with `ExerciseUserStats.lastWeight/lastReps` values. The server does not create a default set — this eliminates the "phantom default set" problem in exercise history.

### Completing a Workout

```
PATCH /api/workouts/:id  { status: "COMPLETED" }
  ↓ workoutService.updateWorkout()
      └─ rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseIds)
           ← aggregates all COMPLETED workouts, overwrites ExerciseUserStats
```

> **Important:** Stats are always **fully rebuilt** (not incrementally). The same function is also called when:
>
> - deleting a workout
> - editing or deleting a set in a `COMPLETED` workout
> - editing a `WorkoutItem` note in a `COMPLETED` workout
> - adding an exercise to an already `COMPLETED` workout

### Note Mechanism (carry-over)

```
WorkoutItem.notes        – note for the current workout
WorkoutItem.previousNote – note from the previous workout (one-time, consumed on add)
ExercisePendingNote      – staging: upserted on every notes change,
                           deleted when exercise is added to a workout
```

## Plan Integration

A Workout can be linked to a `WorkoutPlan` via `workoutPlanId`. The workout starts empty — the plan is a live reference (not a snapshot). Detailed plan module description → [`plan.md`](./plan.md).

### New Workout Fields

| Field | Type | Description |
|---|---|---|
| `workoutPlanId` | `String?` | FK to `WorkoutPlan`; `SET NULL` on plan deletion |
| `skippedPlanExerciseIds` | `String[]` | Exercises skipped in this specific workout |

### Integration Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/workouts/:id/next-from-plan` | First uncompleted exercise from the plan |
| POST | `/api/workouts/:id/skip-plan-exercise` | Add exerciseId to skippedPlanExerciseIds (idempotent) |

### `nextFromPlan` Algorithm (backend + frontend)

```
plan.items
  .sort(orderInPlan asc)
  .filter(item => !workout.items.some(i => i.exerciseId === item.exerciseId))
  .filter(item => !workout.skippedPlanExerciseIds.includes(item.exerciseId))
  .first() || null
```

The frontend computes `nextFromPlan` **locally** from `DataContext.plans` without an extra request — it reacts live to plan changes during an ongoing workout. The backend endpoint `/next-from-plan` exists for other clients.

### Suggest / Skip Flow (frontend)

```
WorkoutDetailScreen (DRAFT + workoutPlanId != null):
  1. activePlan = plans.find(p.id === workout.workoutPlanId)
  2. nextFromPlan = algorithm above (useMemo, live)
  3a. Click [+ <exercise>] → addExercise(nextFromPlan.exerciseId)
       ← reuses existing endpoint POST /api/workouts/:id/exercises
       ← guarantees: previousNote + defaultSet from stats
  3b. Click [⏭] → skipPlanExercise(workoutId, exerciseId)
       ← optimistic: adds to skippedPlanExerciseIds in state + IndexedDB
       ← POST /api/workouts/:id/skip-plan-exercise
       ← rollback (state + IndexedDB) on API error
  4. No nextFromPlan → "Plan completed"
  5. Manual ExerciseSelectionModal works in parallel without changes
```

## Personal Record Tracking

Record (PR) = highest `weight` ever lifted for a given exercise by a given user (`maxWeight`). `maxWeightReps` is context for that record, not a separate ranking metric.

## Files

```
backend/src/modules/workout/
  workout.routes.ts
  workout.controller.ts
  workout.service.ts      ← rebuildExerciseStats, addExerciseToWorkoutWithPendingNote
  workout.repository.ts
  workout.schema.ts       ← Zod schemas
  API.md                  ← detailed req/res contracts
```
