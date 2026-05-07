# GymGate – CLAUDE.md

Fullstack strength-training tracker. Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL. Frontend: React 19 + Vite + TypeScript + Tailwind CSS + Context API (no external state library).

## Project layout

```
backend/src/
  modules/
    auth/       – registration, login, session (JWT in httpOnly cookie)
    user/       – user profile
    exercise/   – exercise CRUD (global + user-created)
    workout/    – workouts, workout items, sets, statistics
  common/middleware/
    auth.ts     – JWT guard
    validate.ts – Zod guard
  config/database.ts  – singleton Prisma client
  index.ts            – Express entry point

frontend/src/
  contexts/
    AuthContext.tsx  – session & user object
    DataContext.tsx  – single global data store (workouts, exercises, stats)
  hooks/
    useWorkout.ts    – hook for WorkoutDetailScreen
    useWorkouts.ts   – hook for workout list
    useExercises.ts  – hook for exercise list
  components/screens/ – all app screens (SPA with custom state-based router)
  utils/
    localStore.ts   – IndexedDB wrapper (offline persistence)
    syncManager.ts  – periodic sync + offline operation queue
    auth.ts         – authFetch + getAuthHeaders helpers
  types/workout.ts  – all domain types
```

## Backend architecture

Every module follows strict layering: `routes → controller → service → repository`.

- **routes** – Express router, applies auth + validate middleware
- **controller** – maps HTTP req/res, delegates to service
- **service** – business logic (stats rebuild, pending note sync, etc.)
- **repository** – Prisma queries only, no business logic

## Key domain models (Prisma schema)

| Model | Purpose |
|---|---|
| `Workout` | Training session (status: DRAFT \| COMPLETED, owns items[]) |
| `WorkoutItem` | Exercise inside a workout (notes, previousNote, sets[]) |
| `WorkoutSet` | Single set (setNumber, weight Decimal, repetitions) |
| `ExerciseUserStats` | Per user+exercise stats (maxWeight, lastWeight, lastReps, totalWorkouts, lastNote) |
| `ExercisePendingNote` | Transient note to carry over to the next workout (userId+exerciseId UNIQUE) |

## Frontend state management

`DataContext.tsx` is the **only** global state. It holds `workouts[]`, `exercises[]`, `stats[]`, `activeWorkoutId`. Every mutating action follows the **optimistic update pattern**: immediately update UI + IndexedDB, then fire the API call in the background. On failure → rollback.

`stats[]` contains `ExerciseUserStats` per exercise – `lastWeight` and `lastReps` come from the last completed workout for that exercise.

`idMappingRef` maps temporary IDs (`temp_*`) to real server IDs after a successful response.

## Add-exercise-to-workout flow

1. Frontend calls `addExerciseToWorkout(workoutId, exerciseId)` from DataContext
2. Optimistic update: creates a `WorkoutItem` with a temp ID and one temp set (`weight: "0"`, `repetitions: 1`)
3. Fires `POST /api/workouts/:workoutId/exercises`
4. Backend: `addExerciseToWorkoutWithPendingNote` (transaction: fetches pending note → creates item with `previousNote` set → deletes pending note)
5. Backend: `addSetToWorkoutItem(item.id, 0, 1, 1)` – creates the first set with default values
6. Frontend: remaps temp IDs to real IDs from the server response

## Statistics

`ExerciseUserStats` is fully **rebuilt** (not incrementally updated) by `rebuildExerciseStatsFromCompletedWorkouts` after every workout completion, workout deletion, or set edit inside a completed workout. It aggregates from all COMPLETED workouts.

## Notes (notes / previousNote)

- `WorkoutItem.notes` – note for the current workout
- `WorkoutItem.previousNote` – note from the previous workout (one-time carry-over, consumed on add)
- `ExercisePendingNote` – staging table for note carry-over (upserted on every notes change, deleted when exercise is added to a workout)

## Docker

Docker is used for **local deployment of the backend**:

- `backend/Dockerfile` – builds the backend image (`node:20-alpine`); runs `npm run build` (Prisma generate + tsc) then starts `node dist/index.js`
- `backend/docker-compose.yml` – orchestrates the backend container; reads env vars from `.env` (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `API_PORT`); mounts source as a volume

```bash
# Run backend via Docker Compose (local deployment)
cd backend && docker-compose up --build
```

**Production** uses **Railway** (Nixpacks, not Docker). The deploy command runs `prisma migrate deploy && node dist/index.js` (`start:railway` script). Frontend is deployed to **Vercel** (`frontend/vercel.json`).

## Running locally (dev mode, no Docker)

```bash
# Backend (port 3000) – requires DATABASE_URL in backend/.env
cd backend && npm run dev    # prisma generate + nodemon tsx

# Frontend (port 5173) – VITE_API_URL defaults to http://localhost:3000
cd frontend && npm run dev
```

## Tests

Framework: **Vitest** (backend only – no frontend test suite currently).  
Repository layer is mocked in service tests via `vi.mock('./workout.repository.js')`.

```bash
cd backend && npm test
```

## Documentation rules

After any API logic change, update:
- the relevant `backend/src/modules/<module>/API.md`
- `other/GymGate_API.postman_collection.json` if the request/response contract or test flow changed

Mention both updates in the PR description.
