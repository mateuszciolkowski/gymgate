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
    plan/       – workout plan CRUD, duplicate, next-from-plan suggestion
  common/middleware/
    auth.ts     – JWT guard
    validate.ts – Zod guard
  config/database.ts  – singleton Prisma client
  index.ts            – Express entry point

frontend/src/
  contexts/
    AuthContext.tsx        – session & user object
    data/                  – global data store split into domain hooks
      DataContext.tsx          – provider
      useDataStore.ts          – core state + initial load
      useDataSync.ts           – sync wiring
      useWorkoutActions.ts     – workout mutations
      useWorkoutItemActions.ts – workout item/set mutations
      useExerciseActions.ts    – exercise mutations
      usePlanActions.ts        – plan mutations
      hooks.ts                 – domain hook accessors
  features/                – feature modules, each with components/ + barrel index.ts
    auth/ workouts/ exercises/ plans/ stats/ menu/
  components/              – shared UI only (app/, navigation/, layouts/, ui/, icons/)
  hooks/                   – useTheme, useNavigation
  utils/
    localStore.ts          – IndexedDB wrapper (offline persistence)
    syncManager.ts         – periodic sync + offline operation queue
    auth.ts                – authFetch + getAuthHeaders helpers
  config/api.ts            – single API_BASE
  types/workout.ts         – all domain types
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
| `Workout` | Training session (status: DRAFT \| COMPLETED, owns items[], optional `workoutPlanId`, `skippedPlanExerciseIds[]`) |
| `WorkoutItem` | Exercise inside a workout (notes, previousNote, sets[]) |
| `WorkoutSet` | Single set (setNumber, weight Decimal, repetitions) |
| `ExerciseUserStats` | Per user+exercise stats (maxWeight, lastWeight, lastReps, totalWorkouts, lastNote) |
| `ExercisePendingNote` | Transient note to carry over to the next workout (userId+exerciseId UNIQUE) |
| `WorkoutPlan` | Ordered template of exercises (name, creatorUserId, isPublic); `creatorUserId=null` = built-in |
| `WorkoutPlanItem` | Single exercise in a plan (exerciseId, orderInPlan); `@@unique([planId, exerciseId])` |

## Frontend state management

`DataContext.tsx` is the **only** global state. It holds `workouts[]`, `exercises[]`, `stats[]`, `plans[]`, `activeWorkoutId`. Every mutating action follows the **optimistic update pattern**: immediately update UI + IndexedDB, then fire the API call in the background. On failure → rollback.

`stats[]` contains `ExerciseUserStats` per exercise – `lastWeight` and `lastReps` come from the last completed workout for that exercise.

`idMappingRef` maps temporary IDs (`temp_*`) to real server IDs after a successful response.

## Workout plan flow

`WorkoutPlan` is an ordered list of exercises. Three visibility tabs: `mine` (own), `builtin` (`creatorUserId=null`), `community` (public plans of other users).

**Creating a workout from a plan:**
1. User selects a plan in `WorkoutFormModal` — dropdown shows `mine + builtin + community`
2. `workoutPlanId` is sent in `POST /api/workouts` body
3. Workout starts empty — `workoutPlanId` is just a reference (live, not a snapshot)

**Plan suggestion in `WorkoutDetailScreen` (DRAFT only):**
- `nextFromPlan` computed **on the frontend** from `DataContext.plans` — no extra API call
- Algorithm: `plan.items.sort(orderInPlan).filter(!added && !skipped).first()`
- UI: amber button `[+ <exercise name>] [⏭]`; `⏭` calls `skipPlanExercise(workoutId, exerciseId)`
- `skipPlanExercise` is optimistic: updates `workout.skippedPlanExerciseIds` locally + IndexedDB, then `POST /api/workouts/:id/skip-plan-exercise`; rolls back on API failure
- When all exercises are added or skipped → "Plan completed" indicator
- Manual `ExerciseSelectionModal` works in parallel without any changes

**Plan CRUD (online-only):** `createPlan`, `updatePlan`, `deletePlan`, `duplicatePlan` require active network connection (throw immediately offline). `skipPlanExercise` and the plan suggestion work fully offline.

**isPublic constraint:** a plan can be made public only if all its exercises have `creatorUserId IN (null, "1")`. Backend returns `400` with a list of offending exercise names.

**Deleting a plan:** `WorkoutPlan` cascade-deletes `WorkoutPlanItem`; `Workout.workoutPlanId` is set to `null` (`onDelete: SetNull`).

## Add-exercise-to-workout flow

1. Frontend calls `addExerciseToWorkout(workoutId, exerciseId)` from DataContext
2. Optimistic update: creates a `WorkoutItem` with a temp ID and **empty `sets: []`**
3. `WorkoutItemCard` auto-opens a `draftSet` pre-filled with `ExerciseUserStats.lastWeight/lastReps` — no set is persisted until the user confirms
4. Fires `POST /api/workouts/:workoutId/exercises`
5. Backend: `addExerciseToWorkoutWithPendingNote` (transaction: fetches pending note → creates item with `previousNote` set → deletes pending note)
6. Backend returns `WorkoutItem` with empty `sets: []` — no default set created
7. Frontend: remaps temp item ID to real ID from the server response

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

## Documentation

Full project documentation lives in **`docs/`** — start there for architecture, module guides, ADRs, and the OpenAPI spec.

```
docs/
├── README.md          ← entry point (map + quick start)
├── ARCHITECTURE.md    ← system diagram, tech stack, DB schema, deployment
├── ONBOARDING.md      ← dev environment, conventions
├── PLANS.md           ← plan file convention
├── modules/           ← details for each module (auth, workout, exercise, plan, offline-sync, database)
├── adr/               ← Architecture Decision Records
└── api/openapi.yaml   ← complete REST API spec (OpenAPI 3.1)
```

After any API logic change, update:
- the relevant `backend/src/modules/<module>/API.md`
- `docs/api/openapi.yaml`
- `other/GymGate_API.postman_collection.json` if the request/response contract or test flow changed

Mention both updates in the PR description.
