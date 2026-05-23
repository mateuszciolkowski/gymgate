# GymGate – Developer Onboarding

## Prerequisites

| Tool   | Minimum Version |
| ------ | --------------- |
| Docker | 24+             |
| Git    | any             |

> Node.js and npm are only required to run the frontend (`npm run dev`). The backend runs exclusively via Docker.

---

## 1. Clone the Repository

```bash
git clone https://github.com/<owner>/gymgate.git
cd gymgate
```

---

## 2. Backend

### 2a. Environment Variables

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/gymgate"
DIRECT_URL="postgresql://user:password@host:5432/gymgate"
JWT_SECRET="min-32-character-random-secret"
NODE_ENV=development
API_PORT=3000
# PORT – set automatically by Railway in production; locally API_PORT is used
```

> `DATABASE_URL` and `DIRECT_URL` can be identical when connecting directly to PostgreSQL.  
> They differ when `DATABASE_URL` goes through a connection pooler (PgBouncer / Prisma Accelerate).

### 2b. Running

**Dev mode (recommended for local development):**

```bash
make dev    # nodemon + tsx, restarts on file changes
```

**Docker (production emulation, no hot-reload):**

```bash
make up     # build image + start container (detached)
make logs   # follow logs
make down   # stop
```

The container automatically runs `prisma migrate deploy` and `npm run build && npm run start`.

Verification:

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 2c. Local PostgreSQL Database (offline option)

If you want to work without connecting to an external database, you can run a local PostgreSQL on port 5433:

```bash
make local-setup   # one-time: start container + migrations + seed test data
```

Then add to `backend/.env`:

```env
DB_ENV=local
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
```

Start the backend with `make dev` — it will connect to the local database.  
Test data: `test@gymgate.com` / `Test1234!` (16 completed workouts + 1 active DRAFT).

Full documentation for options A/B/C: [`docs/running-locally.md`](./running-locally.md)

### 2d. Database Operations (inside Docker container)

```bash
make docker-migrate   # prisma migrate deploy inside container
make docker-seed      # seed database inside container
```

---

## 3. Frontend

```bash
cd ../frontend
cp .env.example .env
```

`.env` – frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=GymGate
VITE_DEBUG=true
```

```bash
npm install
npm run dev        # Vite dev server on port 5173
```

Open: [http://localhost:5173](http://localhost:5173)

---

## 4. Quick Stack Verification

```bash
# Backend
cd backend
npm run typecheck  # tsc --noEmit
npm test           # Vitest

# Frontend
cd frontend
npm run typecheck  # tsc -b
npm run lint       # eslint
```

---

## 5. Makefile – Available Commands

```bash
# Docker container lifecycle
make up             # build image + start (detached)
make down           # stop and remove container
make build          # rebuild image without starting
make logs           # follow logs
make restart        # restart container

# Dev / quality
make dev            # nodemon + tsx (watch mode)
make test           # vitest
make typecheck      # tsc --noEmit

# Database – remote
make migrate        # prisma migrate deploy
make seed           # seed database

# Database – inside container
make docker-migrate # prisma migrate deploy
make docker-seed    # seed database

# Local database (port 5433)
make local-setup    # one-time: start + migrations + seed
make local-up       # start PostgreSQL container
make local-down     # stop (data preserved)
make local-reset    # wipe data + migrations from scratch + seed

# Help
make help           # list all targets with descriptions
```

---

## 6. Code Structure – Where to Find Things

### Backend (`backend/src/`)

```
modules/
  auth/
    auth.routes.ts      ← endpoints: POST /register, POST /login, GET /me
    auth.controller.ts
    auth.service.ts     ← logic: bcrypt, JWT sign/verify
    auth.schema.ts      ← Zod schemas
  exercise/
    exercise.routes.ts  ← GET/POST/PATCH/DELETE /api/exercises
    ...
    API.md              ← module endpoint contracts
  workout/
    workout.routes.ts   ← workouts, items, sets, stats
    ...
    API.md
  user/
    user.routes.ts      ← GET /api/users/:id
    API.md
common/middleware/
  auth.ts              ← JWT guard → req.userId, req.userEmail
  validate.ts          ← Zod guard → 422 on validation error
config/
  database.ts          ← singleton Prisma client
index.ts               ← Express app, CORS, routing, graceful shutdown
```

### Frontend (`frontend/src/`)

```
contexts/
  AuthContext.tsx      ← login, register, logout, token in localStorage
  DataContext.tsx      ← single global store; optimistic updates
hooks/
  useWorkout.ts        ← hook for WorkoutDetailScreen
  useWorkouts.ts       ← hook for workout list
  useExercises.ts      ← hook for exercise list
  useNavigation.ts     ← custom SPA router (useState<Screen>)
  useTheme.ts          ← dark/light mode
utils/
  localStore.ts        ← IndexedDB wrapper (6 stores)
  syncManager.ts       ← background sync, pendingSync queue, retry
  auth.ts              ← authFetch (auto 401 handling) + getAuthHeaders
components/screens/    ← all app screens
types/
  workout.ts           ← domain types (Workout, WorkoutItem, WorkoutSet, ...)
```

---

## 7. Conventions and Rules

- **Every backend module** has an `API.md` in its directory – this file must be updated with every contract change.
- **Optimistic update** – every mutation in `DataContext` first updates UI and IndexedDB, then sends the API request.
- **Stats rebuild** – `ExerciseUserStats` is always **rebuilt from scratch** (not incrementally) after workout completion, deletion, or set edits in a completed workout.
- **PendingNote flow** – notes are carried between workouts via the `ExercisePendingNote` table (upsert on save, delete when exercise is added to a workout).
- **BigInt serialization** – `BigInt.prototype.toJSON` is patched globally in `index.ts`.
- **Production environments** – Railway (backend) + Vercel (frontend); deployment happens via push to `main`.

---

## 8. Links

| Resource               | Path / URL                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| System architecture    | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)                             |
| Auth module            | [`docs/modules/auth.md`](./modules/auth.md)                             |
| Workout module         | [`docs/modules/workout.md`](./modules/workout.md)                       |
| Exercise module        | [`docs/modules/exercise.md`](./modules/exercise.md)                     |
| Offline/sync module    | [`docs/modules/offline-sync.md`](./modules/offline-sync.md)             |
| OpenAPI spec           | [`docs/api/openapi.yaml`](./api/openapi.yaml)                           |
| ADR                    | [`docs/adr/`](./adr/)                                                   |
| Backend – running      | [`docs/running-locally.md`](./running-locally.md)                       |
| Postman collection     | [`backend/postman/`](../backend/postman/)                               |
