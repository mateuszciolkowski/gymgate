# Module: Plan

## Responsibility

Manages workout plans (`WorkoutPlan`) — exercise templates that a user can assign to a workout. The module handles plan CRUD, duplication, and integration with `WorkoutDetailScreen` (suggest / skip).

## Domain Models

```
WorkoutPlan
  id, name, creatorUserId? (null = built-in), isPublic
  → items: WorkoutPlanItem[]

WorkoutPlanItem
  id, planId, exerciseId, orderInPlan
  UNIQUE(planId, exerciseId)  ← an exercise can appear once per plan
```

**Plan visibility:**

| Type | `creatorUserId` | Accessible to |
|---|---|---|
| Built-in | `null` | All users |
| Own | `<userId>` | Owner only |
| Public | `<userId>` + `isPublic=true` | All users (read + duplicate) |

## Endpoints (all require authMiddleware)

| Method | Path | Description |
|---|---|---|
| GET | `/api/plans?tab=mine\|builtin\|community` | List plans with tab filter |
| GET | `/api/plans/:id` | Details (items + exercise); accessible if visible to user |
| POST | `/api/plans` | Create plan (owner = current user) |
| PUT | `/api/plans/:id` | Replace items / change name / isPublic (owner only) |
| DELETE | `/api/plans/:id` | Delete plan (owner only); cascade on items, SetNull on workouts |
| POST | `/api/plans/:id/duplicate` | Private copy of a visible plan |

## Zod Validation

- `name`: 3–100 characters, unique per user (`UNIQUE(creatorUserId, name)` in DB)
- `exerciseIds`: 1–50 UUIDs, no duplicates
- `isPublic=true`: all exercises must have `creatorUserId IN (null, "1")` — backend returns `400` with list of private exercises

## Key Flows

### Creating a Plan

```
POST /api/plans
  ↓ assertExercisesExistAndPublic(ids, requirePublic)   ← one fetch, two conditions
  ↓ assertNameAvailable(userId, name)
  ↓ repository.create() wrapped in runCreateWithUniqueGuard()
       ← guard maps Prisma P2002 (race condition) to 409
  ↓ 201 { data: WorkoutPlan with items[] }
```

### Updating a Plan

Items strategy: **replace-all transactionally** (`deleteMany` + `createMany`). If `exerciseIds` not provided — items unchanged.

```
PUT /api/plans/:id
  ↓ assertExercisesExistAndPublic(newIds, nextIsPublic) if new ids
    assertExercisesArePublic(currentIds)                if only isPublic changes
  ↓ assertNameAvailable() if name != currentName
  ↓ $transaction: deleteMany items → createMany items → update plan
  ↓ 200 { data: WorkoutPlan }
```

### Duplication

```
POST /api/plans/:id/duplicate
  ↓ getPlanById() ← checks visibility (own | built-in | other's public)
  ↓ findFreeCopyName(): "<original> (copy)" → "(copy 2)" → ... → max 999
  ↓ repository.create() with isPublic=false, creatorUserId=userId
  ↓ 201 { data: WorkoutPlan }
```

## Workout Integration (workout plan flow)

Detailed frontend flow description → [`workout.md#plan-integration`](./workout.md#plan-integration).

Workout endpoints used in this integration:

| Method | Path | Description |
|---|---|---|
| POST | `/api/workouts` | `workoutPlanId?` in body — assigns plan to workout |
| GET | `/api/workouts/:id/next-from-plan` | First uncompleted exercise from plan |
| POST | `/api/workouts/:id/skip-plan-exercise` | Add `exerciseId` to `skippedPlanExerciseIds` (idempotent) |

## Offline

- **Plan CRUD (create / update / delete / duplicate)** — requires network connection; functions throw immediately when offline
- **Plan suggestion + skip** — works fully offline: `nextFromPlan` is computed locally from `DataContext.plans`, `skipPlanExercise` applies optimistic update + IndexedDB, API request is sent when network is available; rollback on API error

## Files

```
backend/src/modules/plan/
  plan.routes.ts
  plan.controller.ts
  plan.service.ts      ← CRUD, duplication, isPublic validation, race condition guard
  plan.repository.ts   ← findAll (3 tabs), findById, create, update ($transaction), delete
  plan.schema.ts       ← Zod: createPlanSchema, updatePlanSchema, listPlansSchema
  plan.service.test.ts ← 16 tests: CRUD, validation, duplication, authorization
  API.md               ← detailed req/res contracts
```
