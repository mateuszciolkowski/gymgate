# Copilot Instructions for GymGate

This document defines the expected Copilot workflow and standards for this repository.

## 1) Project Mission

GymGate is a strength-training tracking app:

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + Prisma
- Auth: JWT
- Database: PostgreSQL
- UX: offline-first with background synchronization

Critical product flow:
`start workout -> add exercises -> add sets -> complete workout -> update stats`

## 2) Domain Invariants (DO NOT BREAK)

1. A user can have only one active workout (`activeWorkoutId`) at a time.
2. Adding an exercise to a workout must create a default set (`0 kg`, `1 rep`).
3. Marking a workout as `COMPLETED` must update exercise stats and clear `activeWorkoutId`.
4. Frontend behavior must remain stable in unstable network conditions (local cache + deferred sync).
5. API contracts between frontend and backend must remain consistent.

## 3) Code Map

### Backend

- `backend/src/index.ts` - API bootstrap, CORS, routers, health endpoints
- `backend/src/common/middleware/auth.ts` - JWT auth middleware (`AuthRequest`, `userId` injection)
- `backend/src/common/middleware/validate.ts` - Zod request validation middleware
- `backend/src/config/database.ts` - Prisma client setup
- `backend/src/modules/auth/*` - register/login/me, JWT handling
- `backend/src/modules/user/*` - user operations
- `backend/src/modules/exercise/*` - exercise CRUD + ownership checks
- `backend/src/modules/workout/*` - workouts, items, sets, stats, active workout
- `backend/src/modules/workout/API.md` - workout/stats API contract (must be updated with endpoint changes)
- `backend/src/modules/exercise/API.md` - exercise API contract
- `backend/src/modules/user/API.md` - user API contract
- `backend/prisma/schema.prisma` - domain model

### Frontend

- `frontend/src/App.tsx` - screen orchestration and top-level workout flow navigation
- `frontend/src/contexts/AuthContext.tsx` - auth/session state
- `frontend/src/contexts/DataContext.tsx` - domain state and actions
- `frontend/src/utils/localStore.ts` - IndexedDB/local cache
- `frontend/src/utils/syncManager.ts` - online/offline synchronization
- `frontend/src/utils/auth.ts` - auth-aware fetch wrapper and auth headers
- `frontend/src/hooks/useExercises.ts` - exercise data operations (legacy/compat layer)
- `frontend/src/hooks/useWorkouts.ts` - workout/stats data operations (legacy/compat layer)
- `frontend/src/components/screens/TrainingsScreen.tsx` - workouts list and navigation into workout details
- `frontend/src/components/screens/WorkoutDetailScreen.tsx` - add exercises, sets, update notes, complete workout
- `frontend/src/components/screens/ExerciseSelectionModal.tsx` - exercise-to-workout selection
- `frontend/src/components/screens/StatsScreen.tsx` - user stats overview/list
- `frontend/src/components/screens/StatsExerciseDetailScreen.tsx` - progression detail for one exercise
- `frontend/src/components/exercises/ExerciseList.tsx` - rendering/editing rights for exercises
- `frontend/src/types/workout.ts` - shared workout/stats/frontend contract types
- `frontend/src/types/user.ts` - frontend user shape
- `frontend/src/constants/muscleGroups.ts` - FE-allowed muscle groups (must stay aligned with Prisma enum)

### Key flow path (must stay coherent)

`App.tsx -> DataContext actions -> authFetch/syncManager/localStore -> /api/workouts* and /api/exercises* -> Prisma schema models`

## 4) Backend↔Frontend Module Mapping (for documentation and reviews)

1. Auth module (`backend/src/modules/auth/*`) ↔ `frontend/src/contexts/AuthContext.tsx`, `frontend/src/utils/auth.ts`, `LoginScreen`, `RegisterScreen`.
2. User module (`backend/src/modules/user/*`) ↔ `frontend/src/types/user.ts` + user data consumed from auth payloads.
3. Exercise module (`backend/src/modules/exercise/*`) ↔ `frontend/src/contexts/DataContext.tsx`, `frontend/src/hooks/useExercises.ts`, `AddExerciseScreen`, `EditExerciseScreen`, `ExerciseList`.
4. Workout module (`backend/src/modules/workout/*`) ↔ `frontend/src/contexts/DataContext.tsx`, `frontend/src/hooks/useWorkouts.ts`, `frontend/src/hooks/useWorkout.ts`, `TrainingsScreen`, `WorkoutDetailScreen`, `StatsScreen`, `StatsExerciseDetailScreen`, `StatsProgressChart`, `syncManager`, `localStore`.

## 5) Current documentation gaps to close

1. Missing dedicated auth contract doc (`backend/src/modules/auth/API.md`) while frontend depends on `/api/auth/register|login|me`.
2. `backend/src/modules/workout/API.md` should explicitly include active workout endpoints: `GET /api/workouts/active`, `DELETE /api/workouts/active`.
3. `backend/src/modules/exercise/API.md` currently shows `creator.name`; real payload uses `creator.firstName` and `creator.lastName`.
4. Document that default/public exercises may have `creatorUserId = null`, so `creator` can be nullable in API payloads.
5. Clarify in docs whether create-set endpoint allows `weight = 0`; backend schema currently requires `weight > 0` for manual set creation.

## 6) Schema-Contract checks (Prisma ↔ frontend types)

Validated against `backend/prisma/schema.prisma` and frontend types/usages:

1. `frontend/src/types/workout.ts` contains `MuscleGroup = "LEGS"` which does not exist in Prisma enum (`QUADS`, `HAMSTRINGS`, etc. are used instead).
2. `Exercise.creator` is treated as required in frontend interfaces/usages, but Prisma model allows `creatorUserId` to be null; payload can include nullable `creator`.
3. Frontend create-set DTO accepts `weight: number`, but backend create-set schema enforces `z.number().positive()` (strictly > 0).
4. Auth/user payloads may include backend fields beyond `frontend/src/types/user.ts` (e.g. `activeWorkoutId`, timestamps); frontend currently ignores them.

When changing contracts, update:
- `backend/prisma/schema.prisma`
- relevant `backend/src/modules/*/*.schema.ts`
- relevant `backend/src/modules/*/API.md`
- `frontend/src/types/*`
- `frontend/src/contexts/DataContext.tsx` and sync paths.

## 7) Implementation Rules

1. Preserve layer separation: `routes -> controller -> service -> repository`.
2. Keep request validation in `*.schema.ts` (Zod), not in controllers.
3. Keep business logic in `service`; database access in `repository`.
4. Use strict TypeScript; avoid `any` and silent fallbacks.
5. Make surgical changes only; no incidental refactors.
6. Do not change endpoint semantics without updating docs and frontend usage.
7. For frontend domain flow changes (workout/exercise/stats/sync), prefer `DataContext` as source of truth; treat `useWorkouts/useExercises/useWorkout` as compatibility layer unless migration is explicit.

## 8) API Contracts and Documentation

Before changing endpoints, review:

- `backend/src/modules/auth/API.md` (create and maintain this file)
- `backend/src/modules/user/API.md`
- `backend/src/modules/exercise/API.md`
- `backend/src/modules/workout/API.md`

If request/response changes:

1. Update the relevant `API.md`.
2. Update frontend types and API usage.
3. Verify sync compatibility (`syncManager` + `localStore`).
4. If logic/flow changed, update the Postman collection: `other/GymGate_API.postman_collection.json`.
5. In final summary/PR description, explicitly mention that docs and Postman were updated (or why no update was needed).

## 9) Offline-First Guardrails

1. Never assume constant online connectivity.
2. Data mutations must remain safe for queued sync operations.
3. Do not bypass/remove pending-sync behavior without a complete replacement flow.
4. If endpoint behavior changes, verify sync fetch paths still work:
   - `/api/workouts`
   - `/api/exercises`
   - `/api/workouts/active`
   - `/api/workouts/stats/all`
   - `/api/workouts/stats/overview`
   - `/api/workouts/stats/progression/:exerciseId`
5. Any optimistic UI rollback must update both React state and IndexedDB (`localStore`) to avoid post-refresh divergence.
6. Any deletion of temporary (`temp_*`) entities must cleanup related `pendingSync` operations.

## 10) Testing and Validation

Use existing project tooling only.

### Backend

```bash
cd backend
npm run build
npx vitest run
```

### Frontend

```bash
cd frontend
npm run build
```

Minimum standard:

- Any `service` logic change should include/adjust unit tests.
- Any endpoint contract change requires tests and API docs updates.

## 11) Security

1. Never commit real secrets.
2. Never log tokens, passwords, or sensitive authentication data.
3. Treat `.env.example` as a template only.
4. Surface errors explicitly; do not hide operational failures.

## 12) Preferred Copilot Response Format

After making changes, always report:

1. What changed and why.
2. Which files were touched and behavioral impact.
3. How to verify with concrete commands.
4. Any follow-up risks or regression checks.

## 13) Pre-Completion Checklist

- [ ] Does the workout flow still work end-to-end?
- [ ] Are frontend/backend API contracts still aligned?
- [ ] Is offline/sync behavior still intact?
- [ ] Does backend build pass?
- [ ] Do backend tests pass?
- [ ] Does frontend build pass?
- [ ] Is API documentation updated when required?

## 14) Copilot context hygiene (`.copilotignore`)

To reduce noisy context, `.copilotignore` should include at least:

```gitignore
# Dependencies
**/node_modules/**

# Build outputs
frontend/dist/**
backend/dist/**

# Tool caches
**/.vite/**
**/.cache/**
**/coverage/**

# Generated artifacts committed near sources (backend)
backend/src/**/*.d.ts
backend/src/**/*.d.ts.map
backend/src/**/*.js.map

# Prisma generated artifacts in repo
backend/prisma/seed.js
backend/prisma/seed.d.ts
backend/prisma/seed.js.map
backend/prisma/seed.d.ts.map

# Logs
**/*.log
```

Keep source code, API docs, schema, and migration SQL in scope.

## 15) README updates

Before updating main README in root folder every time ask user if he wants to update it and what to add.
