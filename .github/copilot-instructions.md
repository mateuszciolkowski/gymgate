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
- `backend/src/modules/auth/*` - register/login/me, JWT handling
- `backend/src/modules/user/*` - user operations
- `backend/src/modules/exercise/*` - exercise CRUD
- `backend/src/modules/workout/*` - workouts, sets, stats
- `backend/prisma/schema.prisma` - domain model

### Frontend

- `frontend/src/contexts/AuthContext.tsx` - auth/session state
- `frontend/src/contexts/DataContext.tsx` - domain state and actions
- `frontend/src/utils/localStore.ts` - IndexedDB/local cache
- `frontend/src/utils/syncManager.ts` - online/offline synchronization

## 4) Implementation Rules

1. Preserve layer separation: `routes -> controller -> service -> repository`.
2. Keep request validation in `*.schema.ts` (Zod), not in controllers.
3. Keep business logic in `service`; database access in `repository`.
4. Use strict TypeScript; avoid `any` and silent fallbacks.
5. Make surgical changes only; no incidental refactors.
6. Do not change endpoint semantics without updating docs and frontend usage.

## 5) API Contracts and Documentation

Before changing endpoints, review:

- `backend/src/modules/user/API.md`
- `backend/src/modules/exercise/API.md`
- `backend/src/modules/workout/API.md`

If request/response changes:

1. Update the relevant `API.md`.
2. Update frontend types and API usage.
3. Verify sync compatibility (`syncManager` + `localStore`).

## 6) Offline-First Guardrails

1. Never assume constant online connectivity.
2. Data mutations must remain safe for queued sync operations.
3. Do not bypass/remove pending-sync behavior without a complete replacement flow.
4. If endpoint behavior changes, verify sync fetch paths still work:
   - `/api/workouts`
   - `/api/exercises`
   - `/api/workouts/active`
   - `/api/workouts/stats/all`

## 7) Testing and Validation

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

## 8) Security

1. Never commit real secrets.
2. Never log tokens, passwords, or sensitive authentication data.
3. Treat `.env.example` as a template only.
4. Surface errors explicitly; do not hide operational failures.

## 9) Preferred Copilot Response Format

After making changes, always report:

1. What changed and why.
2. Which files were touched and behavioral impact.
3. How to verify with concrete commands.
4. Any follow-up risks or regression checks.

## 10) Pre-Completion Checklist

- [ ] Does the workout flow still work end-to-end?
- [ ] Are frontend/backend API contracts still aligned?
- [ ] Is offline/sync behavior still intact?
- [ ] Does backend build pass?
- [ ] Do backend tests pass?
- [ ] Does frontend build pass?
- [ ] Is API documentation updated when required?

## 10) README updates

Before updating main README in root folder every time ask user if he wants to update it and what to add.
