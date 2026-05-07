# GymGate – Functional Requirements

Personal strength-training tracker. Users build a custom exercise library, log workouts with sets and reps, and track progress over time.

---

## Module 1 – Users

### Registration
- A user registers by providing: **email** (unique, required), **first name** (required), **last name** (required), **password** (required), **phone number** (optional).
- The system validates the email format and rejects duplicate addresses with `409 Conflict`.
- On successful registration the system returns a JWT token and the user object (without the password field).

### Authentication
- A user logs in with email and password.
- On success the system returns a JWT token valid for the configured TTL.
- Wrong password returns `401 Unauthorized`.
- All protected endpoints require a valid `Authorization: Bearer <token>` header; missing or invalid tokens return `401`.

### Profile
- An authenticated user can view their own profile (`GET /api/auth/me`).
- The password hash is never included in any response.

---

## Module 2 – Exercises

### Default exercise library
- The system provides a shared base of exercises visible to all users (created without a `creatorUserId`).
- Each exercise has: **name**, **description** (optional), and one or more **muscle groups** from a fixed enum.

### Muscle group enum
`CHEST | BACK | SHOULDERS | BICEPS | TRICEPS | FOREARMS | ABS | OBLIQUES | LOWER_BACK | QUADS | HAMSTRINGS | GLUTES | CALVES | ADDUCTORS | HIP_FLEXORS | TRAPS | LATS | MIDDLE_BACK | NECK | FULL_BODY`

### User-created exercises
- A user can create their own exercise visible only to that user (scoped by `creatorUserId`).
- Required: name, at least one muscle group. Optional: description.
- A user can edit (name, muscle groups, description) and delete only their own exercises.
- Deleting an exercise cascades to all `WorkoutItems` and their sets.

### Listing & filtering
- `GET /api/exercises` returns the shared library plus the requesting user's own exercises.
- Supports optional `?muscleGroup=<value>` filter; all returned exercises contain the requested muscle group.

### Personal record display
- When a user has completed at least one workout containing a given exercise, the system surfaces the personal record (max weight) and the date it was set, sourced from `ExerciseUserStats`.
- If the user has never performed the exercise, no record data is shown.

---

## Module 3 – Workouts (Training Sessions)

### Creating a workout
- A user creates a training session with: **workout date** (required), **workout name** (optional), **gym name** (optional), **location** (optional), **workout notes** (optional).
- A new workout is created with status `DRAFT`.

### Adding exercises to a workout
- A user adds an existing exercise to the active `DRAFT` workout, creating a `WorkoutItem`.
- Upon creation the system automatically adds the first set with default values (weight `0`, reps `1`).
- A single workout can contain many exercises.
- Each `WorkoutItem` receives an `orderInWorkout` integer starting at 1; the user can reorder items.

### One-time previous-note carryover
- When a `WorkoutItem` is created the system looks up the `ExercisePendingNote` table for that user + exercise pair.
- If a pending note exists it is copied to `WorkoutItem.previousNote` and the pending-note row is deleted (consumed once).
- The next workout for the same exercise will not receive a `previousNote` unless a new note is saved in between.
- `previousNote` is stored permanently on the `WorkoutItem` so historical workout details always show it.

### Notes
- **Workout-level note** (`Workout.workoutNotes`): a free-text note for the whole session (e.g. "Felt strong today").
- **Exercise-level note** (`WorkoutItem.notes`): a note for the exercise in this session (e.g. "Needed a long warm-up"). Not per-set.
- When a `WorkoutItem.notes` value is saved it is upserted into `ExercisePendingNote` for that user + exercise pair, so it will appear as `previousNote` in the next workout.

### Sets
- A user adds sets to a `WorkoutItem`. Each set has: **weight** (decimal, optional – defaults to `0`), **repetitions** (integer, required – defaults to `1`), **set number** (auto-assigned sequentially: 1, 2, 3…).
- A user can edit (weight, repetitions) or delete any set.

### Completing a workout
- Selecting "finish workout" changes the status from `DRAFT` to `COMPLETED`.
- Upon completion the system fully rebuilds `ExerciseUserStats` for every exercise in the workout by aggregating all `COMPLETED` workouts for that user + exercise pair (not an incremental update).

### Stats rebuild logic (on completion, deletion, or set edit inside a completed workout)
- Identifies the heaviest set per exercise across all completed workouts.
- Updates `ExerciseUserStats`: `maxWeight`, `maxWeightReps`, `maxWeightDate`, `lastWeight`, `lastReps`, `lastWorkoutDate`, `lastNote`, `totalWorkouts`.

### Active workout
- Only one `DRAFT` workout is considered the "active" workout.
- `DELETE /api/workouts/active` releases the active state (workout remains as `DRAFT` but is no longer treated as active).

### Workout CRUD
- A user can list their workouts, filter by status (`DRAFT | COMPLETED`), retrieve full details (including all `WorkoutItems` and their `sets`), update metadata, and delete a workout.
- Deleting a workout triggers a stats rebuild for all affected exercises.

---

## Module 4 – History & Smart Hints

### Previous-session hint
- When an exercise is added to a new workout the response includes `previousNote` (from `ExercisePendingNote`) so the frontend can display the last note the user left for that exercise (e.g. "Focus on knee stability").

### Last session weight & reps
- The frontend uses `ExerciseUserStats.lastWeight` and `lastReps` to display: *"Last time: 80 kg × 10 reps"* when the user opens an exercise.

### Personal record
- The frontend uses `ExerciseUserStats.maxWeight`, `maxWeightReps`, `maxWeightDate` to display: *"Record: 100 kg × 5 reps, 12 Nov 2024"*.

### First-time exercise
- If no `ExerciseUserStats` row exists for the user + exercise pair, the UI indicates this is the user's first time performing the exercise.

### Full workout history
- The system stores all completed workouts permanently. A user can browse the full history, sorted chronologically (newest first), and open any past workout to see all exercises, sets (weight, reps), and notes.

---

## Module 5 – Statistics

### Overview (`GET /api/workouts/stats/overview`)
- Total number of completed workouts.
- Workouts in the last 30 days and in the last 365 days.
- Total sets across all completed workouts.
- Total training volume (sum of `weight × repetitions` for all sets in all completed workouts).

### All exercise stats (`GET /api/workouts/stats/all`)
- Returns one row per exercise the user has performed (sourced from `ExerciseUserStats`), containing:
  - Exercise name
  - Personal record: `maxWeight × maxWeightReps`, date set (`maxWeightDate`)
  - Last session data: `lastWeight`, `lastReps`, `lastWorkoutDate`
  - Last exercise note (`lastNote`)
  - Total number of sessions (`totalWorkouts`)
- Supports sorting by: exercise name (alphabetical), max weight, record date, or total workouts.

### Exercise-specific stats (`GET /api/workouts/stats/exercise/:id`)
- Returns the `ExerciseUserStats` row for the given user + exercise.

### Progression chart (`GET /api/workouts/stats/progression/:exerciseId`)
- Returns a time-series of data points for the selected metric.
- Supported metrics (via `?metric=` query param): `maxSetWeight`, `totalVolume`, `maxReps`.
- Each point contains the workout date and the metric value, allowing the frontend to render a progress chart.

---

## Non-functional notes (scope boundaries)

| Feature | Status |
|---|---|
| Exercise photos (START / MIDDLE / END) | Planned – not yet implemented |
| Push notifications | Planned – not yet implemented |
| Profile edit (name, phone, password change) | Planned – not yet implemented |
| Offline support with sync queue | Implemented (frontend IndexedDB + syncManager) |
| Multi-user data isolation | Enforced – every query is scoped to the authenticated user |
| JWT auth (httpOnly cookie or Bearer header) | Bearer header implemented |
