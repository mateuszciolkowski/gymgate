# Backend – CLAUDE.md

> Subproject guide for the GymGate API. For the whole-project picture see [`../CLAUDE.md`](../CLAUDE.md).

## Stack

Node.js 20 · Express 5 · TypeScript · Prisma 5.22 · PostgreSQL (Supabase) · Zod 4 · JWT (`jsonwebtoken`) · bcryptjs · Vitest + Supertest. ESM (`"type": "module"`).

## Layout

```
src/
  index.ts            – entry point: starts the HTTP listener, graceful shutdown, request timeout
  app.ts              – createApp(): builds + configures Express (CORS, routers, BigInt serialization) without listening (testable)
  modules/
    auth/             – register, login, GET /me (JWT)
    user/             – user profile (GET /api/users/:id)
    exercise/         – exercise CRUD (global + user-created)
    workout/          – workouts, items, sets, stats, plan integration  (largest module)
    plan/             – workout plan CRUD, duplicate, suggest/skip
  common/
    middleware/
      auth.ts         – JWT guard → req.userId, req.userEmail
      validate.ts     – Zod guard → 422 on invalid body/query
      rateLimit.ts    – brute-force guard on auth endpoints (skipped in NODE_ENV=test)
    errors.ts         – typed app errors (NotFoundError, etc.)
  config/
    database.ts       – singleton Prisma client (one instance in EVERY environment)
    constants.ts      – "global" exercise creator convention (legacy id "1" or null)
  test/
    mockResponse.ts   – chainable Express Response mock for controller tests
```

## Module layering (strict – never skip a layer)

```
routes → controller → service → repository
```

| File | Role |
|---|---|
| `*.routes.ts`      | Express router; applies `authMiddleware` + `validate(schema)` |
| `*.controller.ts`  | Maps HTTP req/res, delegates to service, shapes the response |
| `*.service.ts`     | Business logic (stats rebuild, pending-note sync, visibility checks) |
| `*.repository.ts`  | Prisma queries only – no business logic |
| `*.schema.ts`      | Zod request schemas |
| `API.md`           | Endpoint contract for the module – **update on every contract change** |

## Domain rules that must hold

- **One active workout per user** (`User.activeWorkoutId`).
- **Adding an exercise creates no default set** – the first set is a frontend-only draft.
- **Completing a workout** rebuilds stats and clears `activeWorkoutId`.
- **`ExerciseUserStats` is fully rebuilt** (`rebuildExerciseStatsFromCompletedWorkouts`) after completion, deletion, or a set edit in a completed workout – never incremental.
- **Notes carry-over** via `ExercisePendingNote` (upsert on save, deleted when the exercise is added to a workout).
- **Plan visibility** – a workout can only attach to a plan visible to the user (own / built-in / public); the service throws `NotFoundError` otherwise.
- **Public plans** may contain only exercises whose `creatorUserId IN (null, "1")`; otherwise the API returns `400` with offending names.

## Conventions

- **Response shape:** success `{ success: true, data }` · error `{ success: false, error }`.
- **BigInt** from Prisma aggregates is serialized as a string (patched in `app.ts`).
- **Comments + identifiers: English. User-facing strings: Polish** (do not translate).
- Tests live next to the code (`*.test.ts`); the repository layer is mocked in service tests.

## Commands

```bash
npm run dev          # prisma generate + nodemon (tsx), port 3000 (API_PORT)
npm run build        # prisma generate + tsc
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run check        # typecheck + test
npm run seed         # seed database (also seed:plans, seed:local)
```

Local DB (Docker, port 5433): `npm run db:local:up` / `db:local:down`. Full options + Makefile targets → [`../docs/running-locally.md`](../docs/running-locally.md).

## More

- Module API contracts → `src/modules/<module>/API.md`
- Full REST spec → [`../docs/api/openapi.yaml`](../docs/api/openapi.yaml)
- DB schema → [`prisma/schema.prisma`](./prisma/schema.prisma) and [`../docs/modules/database.md`](../docs/modules/database.md)
