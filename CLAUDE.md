# GymGate – CLAUDE.md

Fullstack strength-training tracker with **two production clients on one backend**: the PWA (`frontend/`, React 19 + Vite + TypeScript + Tailwind CSS + Context API) and the native app (`mobile/`, Expo + React Native, offline-first). Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Two clients, one backend (read before any change)

The PWA and the native app are both supported, long term, at the same time. They share one backend, one database and the same user accounts, and one person can use both in parallel on the same account. Every change must keep **both** working. Never treat one of them as legacy.

**Backend and database**
- Endpoints used by the PWA stay backward compatible. Contract changes are additive (new optional fields, new endpoints). Removing or changing the meaning of a field needs a plan for both clients.
- Migrations are additive: no dropping or renaming columns or tables either client reads. Installed app versions cannot be force-updated, so old app builds must keep working too.
- Every write path, old or new, must reach the sync log. Postgres triggers write `sync_changes` for the synced tables. A new synced table or column needs: the trigger, `GET /api/sync/pull` support, a `POST /api/sync/push` operation if the app writes it, and the matching local schema in `mobile/src/db/`.
- Writes from the PWA's REST endpoints and from the app's sync push must give the same result in the database (same validation, same cascades, same stats rebuild).

**Domain logic exists twice**
- PWA: `frontend/src/`. App: `mobile/src/domain/` (ported logic, plus stats computed locally in `mobile/src/domain/stats.ts`; the server rebuilds `ExerciseUserStats`).
- A behaviour change goes into both clients and, where it applies, the backend. A deliberate difference is recorded in `mobile/docs/DECYZJE.md`. Feature parity checklist: `mobile/docs/PARYTET.md`.

**Features: always build both clients (mandatory)**
Every new feature or behaviour change goes into the PWA and the app in the same branch, with tests in each, unless the owner explicitly says otherwise or the feature only makes sense on one platform (e.g. Live Activity) — then say so and record it in `mobile/docs/DECYZJE.md`.

**Enforcement**
- A project hook (`.claude/settings.json` → `.claude/hooks/check-two-clients.sh`) blocks a `git commit` that changes client logic in only one of `frontend/src` and `mobile/src|mobile/app`. Fix the other client, or put `Only-PWA: <reason>` / `Only-app: <reason>` in the commit message and tell the owner why.
- Shared parity fixtures in `shared/parity/*.json` run in both test suites (`frontend/src/utils/parity.test.ts`, `mobile/src/domain/parity.test.ts`). Logic that exists in both clients gets a fixture; change the fixture first, then make both suites pass.

**Branches**
Start every task on a new branch from the latest `dev` (`feat/…`, `fix/…`, `chore/…`). `mobile-migration` is finished and merged; do not commit to it.

**Bug reports: always check both clients (mandatory)**
Whenever the owner reports a bug, in either client or the backend, before fixing:
1. Find the root cause in the client where it was reported.
2. Check whether the same bug exists in the other client: find the counterpart code (PWA `frontend/src/` ↔ app `mobile/src/`, same feature or ported domain function in `mobile/src/domain/`) and the shared backend path. Read it, do not assume.
3. If the cause is in the backend, both clients are affected by definition: fix it once there.
4. Fix every client that has the bug in the same change, with a test in each. If the other client does not have it, say so in the reply with the reason (e.g. "the PWA has no drawer swipe gesture", "logic lives only in the app's local stats").
5. In the reply, always state: where the bug was, whether it also affected the other client, and what was fixed where.
Platform-only bugs (e.g. a React Native worklet crash, an iOS keyboard issue, a browser-only CSS issue) still get step 2, answered briefly.

**Sync and offline**
- The app writes every change to local SQLite plus an outbox in one transaction and syncs later; the PWA keeps its own IndexedDB queue. Conflict rule: the newer change (`at`) wins per record; older ones come back as `superseded`, permanent failures as `rejected`.
- Protocol: `backend/src/modules/sync/API.md` and `mobile/docs/PLAN.md` section 5. A change to a push operation or the pull shape updates both sides and the protocol tests.

**Testing a change that touches shared behaviour**
- Backend: `npm test` and `npm run test:integration` in `backend/` (local DB only).
- PWA against the changed backend: `npm test` in `frontend/` and the smoke test `mobile/tools/pwa-smoke/smoke.mjs`.
- App: `npm run typecheck`, `npm run lint`, `npm test` in `mobile/`; against a local backend: `npm run test:protocol` (sync protocol) and `npm run test:parity` (local stats vs server).
- Untested cases that matter most: editing the same record in both clients, and offline work in the app while the PWA is used.

**Deployment**
- Backend deploys (Railway, `prisma migrate deploy` on merge to `main`) affect both clients at once. Back up the production database first. Checklist and rollback: `mobile/docs/WDROZENIE_BACKENDU.md`.
- Mobile work context, status and decisions: `MIGRACJA_MOBILE.md`, `mobile/docs/STATUS.md`, `mobile/docs/DECYZJE.md`. `mobile/` needs Node 24 (Expo SDK 58); `backend/` and `frontend/` use Node 20.

## Database Safety & Pre-Destructive Backup Policy

**Iron Law:** Before executing any migration (`prisma migrate dev/deploy`, `prisma db push`), database reset, dangerous SQL, destructive seed or bulk data modification, **ALWAYS** execute the automated SQL backup:
```bash
npm run --prefix backend backup:sql
```
Verify that the new timestamped `.sql` file is created in `backend/backups/` before proceeding with the operation. See `.agent/skills/pre-destructive-backup/SKILL.md`.

Subproject guides: `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `mobile/CLAUDE.md`.

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

mobile/                    – native app (Expo Router, offline-first; Node 24)
  app/                     – routes (screens)
  src/domain/              – logic ported from the PWA + local stats
  src/db/                  – local SQLite schema, migrations, repositories (each write + outbox in one transaction)
  src/sync/                – outbox, push, pull, sync engine, rejected-change issues
  src/session/ src/api/    – mobile sessions (access + refresh token)
  src/features/            – screens per area (workouts, exercises, plans, stats, settings, liveActivity)
  docs/                    – STATUS, PLAN, PARYTET (parity checklist), DECYZJE (decisions)
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
| `WorkoutPlanVersion` | Read-only snapshot of a plan after each change (history); `exercises` JSON `[{exerciseId, name}]`; visible to whoever can edit the plan |

## Frontend state management

`DataContext.tsx` is the **only** global state. It holds `workouts[]`, `exercises[]`, `stats[]`, `plans[]`, `activeWorkoutId`. Every mutating action follows the **optimistic update pattern**: immediately update UI + IndexedDB, then fire the API call in the background. On failure → rollback.

`stats[]` contains `ExerciseUserStats` per exercise – `lastWeight` and `lastReps` come from the last completed workout for that exercise.

`idMappingRef` maps temporary IDs (`temp_*`) to real server IDs after a successful response.

## Workout plan flow

`WorkoutPlan` is an ordered list of exercises. Three visibility tabs: `mine` (own), `builtin` (`creatorUserId=null`), `community` (public plans of other users).

**Creating a workout from a plan:**
1. User selects a plan in `WorkoutFormModal` — dropdown shows favorites + built-in; favorites first with a "Ulubione" badge
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

Backend: **Vitest** (unit + integration). Frontend: its own suite (`cd frontend && npm test`). Mobile: Jest + React Native Testing Library, Maestro flows in `mobile/.maestro/` (see "Two clients, one backend").  
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
