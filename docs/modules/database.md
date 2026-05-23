# Module: Database

## Technology

PostgreSQL 16 managed by **Prisma ORM** (`prisma@5.22`). Production: Supabase. Local: Docker (`postgres:16-alpine`) or any PostgreSQL instance.

## Connection Configuration

```env
DATABASE_URL="postgresql://..."   # via pooler (Prisma Accelerate / PgBouncer) or direct
DIRECT_URL="postgresql://..."     # direct connection, used for migrations
```

Singleton Prisma client: `backend/src/config/database.ts`

## Schema – Tables and Relations

### `users`

| Column           | Type         | Description                             |
|------------------|--------------|-----------------------------------------|
| `id`             | UUID PK      |                                         |
| `email`          | STRING UNIQUE|                                         |
| `password`       | STRING       | bcrypt hash                             |
| `firstName`      | STRING       |                                         |
| `lastName`       | STRING       |                                         |
| `phone`          | STRING?      |                                         |
| `activeWorkoutId`| UUID? UNIQUE | FK → workouts (nullable, SetNull)       |
| `updatedAt`      | DATETIME     |                                         |

### `exercises`

| Column         | Type         | Description                                |
|----------------|--------------|--------------------------------------------|
| `id`           | UUID PK      |                                            |
| `name`         | STRING       |                                            |
| `muscleGroups` | MuscleGroup[]| enum array                                 |
| `description`  | STRING?      |                                            |
| `creatorUserId`| UUID?        | FK → users (Cascade); null = global        |
| `createdAt`    | DATETIME     |                                            |
| `updatedAt`    | DATETIME     |                                            |

### `exercise_photos`

| Column       | Type       | Description                 |
|--------------|------------|-----------------------------|
| `id`         | UUID PK    |                             |
| `exerciseId` | UUID       | FK → exercises (Cascade)    |
| `photoStage` | PhotoStage | START \| MIDDLE \| END      |
| `photoUrl`   | STRING     | URL or local path           |
| `createdAt`  | DATETIME   |                             |

### `workouts`

| Column           | Type          | Description                |
|------------------|---------------|----------------------------|
| `id`             | UUID PK       |                            |
| `userId`         | UUID          | FK → users (Cascade)       |
| `workoutDate`    | DATETIME      | default: now()             |
| `status`         | WorkoutStatus | DRAFT \| COMPLETED         |
| `workoutName`    | STRING?       |                            |
| `gymName`        | STRING?       |                            |
| `location`       | STRING?       |                            |
| `workoutNotes`   | STRING?       |                            |
| `durationSeconds`| INT?          |                            |
| `createdAt`      | DATETIME      |                            |
| `updatedAt`      | DATETIME      |                            |

### `workout_items`

| Column          | Type     | Description                           |
|-----------------|----------|---------------------------------------|
| `id`            | UUID PK  |                                       |
| `workoutId`     | UUID     | FK → workouts (Cascade)               |
| `exerciseId`    | UUID     | FK → exercises (Cascade)              |
| `orderInWorkout`| INT      | exercise order within workout         |
| `notes`         | STRING?  | note for current workout              |
| `previousNote`  | STRING?  | carry-over from previous workout      |
| `createdAt`     | DATETIME |                                       |
| `updatedAt`     | DATETIME |                                       |

### `workout_sets`

| Column       | Type           | Description           |
|--------------|----------------|-----------------------|
| `id`         | UUID PK        |                       |
| `itemId`     | UUID           | FK → workout_items (Cascade) |
| `setNumber`  | INT            | set number            |
| `weight`     | Decimal(6,2)   | weight in kg          |
| `repetitions`| INT            | number of repetitions |
| `createdAt`  | DATETIME       |                       |
| `updatedAt`  | DATETIME       |                       |

### `exercise_user_stats`

Stats cache, rebuilt on every change to completed workouts.

| Column           | Type         | Description                           |
|------------------|--------------|---------------------------------------|
| `id`             | UUID PK      |                                       |
| `userId`         | UUID         | FK → users (Cascade)                  |
| `exerciseId`     | UUID         | FK → exercises (Cascade)              |
| `maxWeight`      | Decimal(6,2) | highest weight ever lifted            |
| `maxWeightReps`  | INT          | repetitions at maxWeight              |
| `maxWeightDate`  | DATETIME     |                                       |
| `lastWeight`     | Decimal(6,2) | weight from last COMPLETED workout    |
| `lastReps`       | INT          |                                       |
| `lastWorkoutDate`| DATETIME     |                                       |
| `totalWorkouts`  | INT          | count of COMPLETED with this exercise |
| `lastNote`       | STRING?      |                                       |
| `createdAt`      | DATETIME     |                                       |
| `updatedAt`      | DATETIME     |                                       |

**UNIQUE:** `(userId, exerciseId)`

### `exercise_pending_notes`

Transient table for the note carry-over mechanism.

| Column       | Type     | Description                    |
|--------------|----------|--------------------------------|
| `id`         | UUID PK  |                                |
| `userId`     | UUID     | FK → users (Cascade)           |
| `exerciseId` | UUID     | FK → exercises (Cascade)       |
| `note`       | STRING   |                                |
| `createdAt`  | DATETIME |                                |
| `updatedAt`  | DATETIME |                                |

**UNIQUE:** `(userId, exerciseId)` – one pending note per exercise per user.

## Enums

```prisma
enum MuscleGroup {
  CHEST | BACK | SHOULDERS | BICEPS | TRICEPS | FOREARMS | ABS
  OBLIQUES | LOWER_BACK | QUADS | HAMSTRINGS | GLUTES | CALVES
  ADDUCTORS | HIP_FLEXORS | TRAPS | LATS | MIDDLE_BACK | NECK | FULL_BODY
}

enum PhotoStage { START | MIDDLE | END }

enum WorkoutStatus { DRAFT | COMPLETED }
```

## Migrations

```bash
make migrate-dev   # prisma migrate dev – creates a new migration (dev environment)
make migrate       # prisma migrate deploy – applies migrations (prod/staging)
make migrate-reset # ⚠ resets DB and replays all migrations (destroys data)
```

Migration files: `backend/prisma/migrations/`  
Schema: `backend/prisma/schema.prisma`

## Local Mode (DB_ENV=local)

The `DB_ENV` switch in `.env` allows selecting the database without changing the URL:

| Value | Database | When to use |
|---|---|---|
| `remote` (default) | Supabase | prod / staging |
| `local` | Docker PostgreSQL, port 5433 | local testing, development |

Required variables in `.env`:
```env
DB_ENV=remote
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
DIRECT_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
```

### First Local Database Run

```bash
cd backend
make local-setup   # start container + migrations + seed (one-time)
# Change DB_ENV=local in .env
make dev           # backend connects to local database
```

### Available Makefile Commands

```bash
make local-up       # start PostgreSQL container (port 5433)
make local-down     # stop container (data in Docker volume persists)
make local-migrate  # apply migrations to local database
make local-seed     # seed: exercises + plans + test user with history
make local-setup    # local-up + local-migrate + local-seed (first-time setup)
make local-reset    # local-migrate + local-seed (wipe and re-seed)
```

### Test User (seed-local)

| | |
|---|---|
| Email | `test@gymgate.com` |
| Password | `Test1234!` |
| Workouts | 16 completed (4 types: chest / back / legs / shoulders-arms, 4 cycles ~3 months) |
| Data | Weight progression visible, `ExerciseUserStats` populated |
| Active workout | 1 DRAFT (chest, 2 exercises without sets) |

Script: `backend/prisma/seed-local.ts` — always uses `DATABASE_URL_LOCAL`, regardless of `DB_ENV`.

## Implementation Notes

- `BigInt.prototype.toJSON` is patched globally in `backend/src/index.ts` – enables BigInt JSON serialization.
- `DIRECT_URL` is required when `DATABASE_URL` goes through a pooler (e.g. Supabase uses PgBouncer for transactional connections).
- Singleton Prisma client (`config/database.ts`) is closed gracefully on `SIGTERM` / `SIGINT`.
