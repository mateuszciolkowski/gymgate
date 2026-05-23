# GymGate – Project Documentation

> Entry point for developers and AI agents working with this repository.  
> Project: fullstack strength-training tracker. Backend: Node.js + Express + Prisma + PostgreSQL. Frontend: React 19 + Vite + Tailwind CSS.

---

## Quick Start

```bash
# Backend (port 3000) – runs via Docker
cd backend && cp .env.example .env  # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, API_PORT
make up    # build + start container; migrations run automatically
make logs  # optional – follow logs

# Frontend (port 5173)
cd frontend && cp .env.example .env
npm install && npm run dev
```

Full onboarding → [`ONBOARDING.md`](./ONBOARDING.md)

---

## Documentation Map

```
docs/
├── README.md              ← you are here – entry point
├── ARCHITECTURE.md        ← system diagram, tech stack, data models, deployment
├── ONBOARDING.md          ← dev environment, code structure, conventions
├── PLANS.md               ← plan file convention (naming + lifecycle)
│
├── modules/
│   ├── auth.md            ← registration, login, JWT, AuthContext
│   ├── workout.md         ← workouts, sets, stats, PendingNote flow, plan integration
│   ├── plan.md            ← plan CRUD, duplication, suggest/skip flow
│   ├── exercise.md        ← exercise CRUD, MuscleGroup enum
│   ├── database.md        ← DB schema, tables, Prisma, migrations
│   └── offline-sync.md    ← IndexedDB, SyncManager, optimistic updates, temp IDs
│
├── adr/
│   ├── 001-postgresql.md          ← why PostgreSQL
│   ├── 002-jwt-bearer.md          ← JWT Bearer vs cookie
│   ├── 003-offline-indexeddb.md   ← offline-first with IndexedDB
│   ├── 004-context-api-state.md   ← Context API instead of Zustand/Redux
│   └── 005-stats-rebuild.md       ← full stats rebuild vs incremental
│
└── api/
    └── openapi.yaml       ← complete REST API spec (OpenAPI 3.1)
```

---

## Key Conventions (TL;DR for agents)

| Rule                  | Details                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Backend layering**  | `routes → controller → service → repository` – layers are never skipped                                       |
| **Validation**        | Zod schema in `*.schema.ts`; middleware `validate(schema)` returns 422                                        |
| **Auth**              | `authMiddleware` attaches `req.userId` and `req.userEmail` to every protected request                         |
| **Optimistic update** | UI + IndexedDB updated before server response; rollback on server error                                       |
| **Stats**             | `ExerciseUserStats` is always **fully rebuilt** – incremental updates are not used                            |
| **Temp IDs**          | Offline entities have prefix `temp_*`; SyncManager replaces them with real UUIDs after sync                   |
| **API docs**          | After changing a contract, update `backend/src/modules/<module>/API.md` **and** `docs/api/openapi.yaml`       |
| **Response format**   | Success: `{ success: true, data: ... }` / Error: `{ success: false, error: "..." }`                          |
| **Execution plans**   | Naming and location convention: [`PLANS.md`](./PLANS.md)                                                      |

---

## Related Resources

| Resource                             | Location                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Backend – running (3 options)        | [`docs/running-locally.md`](./running-locally.md)                                       |
| Auth module – API contract           | [`backend/src/modules/auth/auth.routes.ts`](../backend/src/modules/auth/auth.routes.ts) |
| Exercise module – API contract       | [`backend/src/modules/exercise/API.md`](../backend/src/modules/exercise/API.md)         |
| Workout module – API contract        | [`backend/src/modules/workout/API.md`](../backend/src/modules/workout/API.md)           |
| Plan module – API contract           | [`backend/src/modules/plan/API.md`](../backend/src/modules/plan/API.md)                 |
| Prisma schema                        | [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)                       |
| Postman collection                   | [`backend/postman/`](../backend/postman/)                                               |
| Frontend offline docs                | [`frontend/docs/OFFLINE.md`](../frontend/docs/OFFLINE.md)                               |
| Functional requirements              | [`other/functional-requirements.md`](../other/functional-requirements.md)               |
| Plan file convention                 | [`docs/PLANS.md`](./PLANS.md); active files in [`plans/`](../plans/)                    |
