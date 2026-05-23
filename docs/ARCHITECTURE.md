# GymGate – System Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                           │
│                                                          │
│  React 19 SPA (Vite)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  AuthContext │  │  DataContext │  │  IndexedDB   │  │
│  │  (JWT session)│  │  (global     │  │  (localStore)│  │
│  └──────────────┘  │   store)     │  └──────────────┘  │
│                    └──────┬───────┘         ▲           │
│                           │ authFetch        │           │
│                     SyncManager ────────────┘           │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTPS / REST JSON
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     BACKEND (Railway)                    │
│                                                          │
│  Express 5 + TypeScript                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  authMiddleware (JWT)  →  validate (Zod)          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  /api/auth  /api/exercises  /api/workouts  /api/plans    │
│      │            │               │              │        │
│  auth mod   exercise mod   workout mod    plan mod        │
│  routes → controller → service → repository             │
│                           │                              │
│                        Prisma ORM                        │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
                   PostgreSQL (Supabase)
```

## Tech Stack

### Backend

| Layer          | Technology              | Version |
| -------------- | ----------------------- | ------- |
| Runtime        | Node.js                 | 20 LTS  |
| Framework      | Express                 | 5.x     |
| Language       | TypeScript              | 5.9     |
| ORM            | Prisma                  | 5.22    |
| Database       | PostgreSQL (Supabase)   | 16      |
| Auth           | JWT (`jsonwebtoken`)    | 9.x     |
| Hashing        | bcryptjs                | 3.x     |
| Validation     | Zod                     | 4.x     |
| Tests          | Vitest + Supertest      | 4.x     |
| Containerization | Docker / docker-compose | -     |
| Deploy         | Railway (Nixpacks)      | -       |

### Frontend

| Layer           | Technology                  | Version |
| --------------- | --------------------------- | ------- |
| Framework       | React                       | 19      |
| Bundler         | Vite                        | 7.x     |
| Language        | TypeScript                  | 5.9     |
| Styling         | Tailwind CSS                | 4.x     |
| State           | Context API (no libraries)  | -       |
| Offline storage | IndexedDB (`localStore`)    | -       |
| E2E Tests       | Playwright                  | 1.x     |
| Deploy          | Vercel                      | -       |

## Backend Architecture

### Module Structure

```
backend/src/
├── modules/
│   ├── auth/        – registration, login, GET /me
│   ├── user/        – user profile
│   ├── exercise/    – exercise CRUD (global + user-created)
│   ├── workout/     – workouts, items, sets, stats, plan integration
│   └── plan/        – workout plan CRUD, duplication, suggest/skip
├── common/
│   └── middleware/
│       ├── auth.ts      – JWT guard (authMiddleware)
│       └── validate.ts  – Zod guard (validate(schema))
├── config/
│   └── database.ts  – singleton Prisma client
└── index.ts         – Express entry point
```

### Module Layering (strict)

```
routes → controller → service → repository
```

| Layer        | Responsibility                                             |
| ------------ | ---------------------------------------------------------- |
| `routes`     | Express router, applies auth + validate middleware         |
| `controller` | Maps HTTP req/res, delegates to service, returns response  |
| `service`    | Business logic (rebuild stats, pending note sync, etc.)    |
| `repository` | Prisma queries only, no business logic                     |

### Middleware Pipeline

```
Every protected request:
  authMiddleware  →  validate(schema)  →  controller
```

- `authMiddleware` – verifies `Authorization: Bearer <token>`, attaches `req.userId` and `req.userEmail`
- `validate(schema)` – validates `req.body` / `req.query` via Zod; returns `422` on failure

## Frontend Architecture

### State Management

The only global state is `DataContext`. No external state library is used (Redux, Zustand, etc.).

```
AuthContext   – JWT session + user data (localStorage)
DataContext   – workouts[], exercises[], stats[], plans[], activeWorkoutId
                → optimistic updates + IndexedDB + API calls
SyncManager   – background sync every 2 min + flush on reconnect
localStore    – IndexedDB wrapper (stores: workouts, exercises, stats, plans, pendingSync, metadata)
```

### Update Pattern (optimistic update)

```
1. Update UI immediately (setState + localStore)
2. Send request to API in background
3. On network error → add to pendingSync in IndexedDB
4. On server error → rollback
5. SyncManager replays pendingSync on reconnect (max 3 retries)
```

### Router (SPA without library)

Navigation is based on a custom `useNavigation` hook and `useState<Screen>` – no React Router. Screens: `trainings`, `workout-detail`, `exercises`, `add-exercise`, `edit-exercise`, `stats`, `stats-exercise-detail`, `menu`.

## Database Schema

```
User (users)
  id, email, password, firstName, lastName, phone?, activeWorkoutId?

Exercise (exercises)
  id, name, muscleGroups[], description?, creatorUserId?
  → photos: ExercisePhoto[]

Workout (workouts)
  id, userId, workoutDate, status(DRAFT|COMPLETED), workoutName?,
  gymName?, location?, workoutNotes?, durationSeconds?,
  workoutPlanId? (→ WorkoutPlan, onDelete: SetNull),
  skippedPlanExerciseIds[] (exercises skipped in this workout)
  → items: WorkoutItem[]

WorkoutItem (workout_items)
  id, workoutId, exerciseId, orderInWorkout, notes?, previousNote?
  → sets: WorkoutSet[]

WorkoutSet (workout_sets)
  id, itemId, setNumber, weight(Decimal 6,2), repetitions

ExerciseUserStats (exercise_user_stats)
  id, userId, exerciseId, maxWeight, maxWeightReps, maxWeightDate,
  lastWeight, lastReps, lastWorkoutDate, totalWorkouts, lastNote?
  → UNIQUE(userId, exerciseId)

ExercisePendingNote (exercise_pending_notes)
  id, userId, exerciseId, note
  → UNIQUE(userId, exerciseId)  ← transient table for note carry-over

WorkoutPlan (workout_plans)
  id, name, creatorUserId? (null = built-in), isPublic
  → items: WorkoutPlanItem[]
  → UNIQUE(creatorUserId, name)

WorkoutPlanItem (workout_plan_items)
  id, planId, exerciseId, orderInPlan
  → UNIQUE(planId, exerciseId)
```

## Deployment

| Environment | Backend                | Frontend      | Database             |
| ----------- | ---------------------- | ------------- | -------------------- |
| Production  | Railway (Nixpacks)     | Vercel        | Supabase PG 16       |
| Local       | `npm run dev` / Docker | `npm run dev` | Docker PG / Supabase |

### CORS

`ALLOWED_ORIGINS` (env var, CSV) – defaults to `http://localhost:5173` + `https://gymgate.vercel.app`.

## Architecture Decision Records

Detailed rationale for design decisions: [`docs/adr/`](./adr/)

- [ADR-001 – PostgreSQL as the database](./adr/001-postgresql.md)
- [ADR-002 – JWT Bearer instead of session cookies](./adr/002-jwt-bearer.md)
- [ADR-003 – Offline-first with IndexedDB](./adr/003-offline-indexeddb.md)
- [ADR-004 – Context API instead of external state manager](./adr/004-context-api-state.md)
- [ADR-005 – Full stats rebuild instead of incremental updates](./adr/005-stats-rebuild.md)
