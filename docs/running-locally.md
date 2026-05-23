# Running GymGate locally

Three ways to run the backend, depending on whether you want a fully local setup or want to connect to the remote database.

---

## Option A — dev server + remote database (simplest)

Use this when the database already lives on Railway, Supabase, or any other hosted PostgreSQL.

**1. Install dependencies**

```bash
cd backend
npm install
```

**2. Create `.env`**

```bash
cp .env.example .env
```

Fill in the values:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="some-strong-secret"
NODE_ENV=development
API_PORT=3000
```

`DATABASE_URL` is used by Prisma for queries.  
`DIRECT_URL` is used by Prisma for migrations (required when the main URL goes through a connection pooler like PgBouncer).  
If you connect directly to PostgreSQL without a pooler, both can be the same value.

**3. Run migrations and seed**

```bash
make migrate   # prisma migrate deploy
make seed      # optional – populates the DB with sample data
```

**4. Start the dev server**

```bash
make dev       # nodemon + tsx, restarts on file changes
```

Server runs on `http://localhost:3000`.

---

## Option B — dev server + local PostgreSQL (fully offline)

Use this when you want a completely self-contained setup without any external service. The local PostgreSQL runs on port **5433** (to avoid conflict with any existing local instance on 5432).

**1. One-time setup**

```bash
cd backend
make local-setup   # starts Docker PostgreSQL, applies migrations, seeds test data
```

This runs three steps automatically:
- `make local-up` — starts a PostgreSQL container on port 5433 (data persisted in a Docker volume)
- `make local-migrate` — applies all Prisma migrations to the local DB
- `make local-seed` — seeds global exercises, built-in plans, and a test user with 16 completed workouts + 1 active draft

**2. Configure `.env`**

Add these two variables to `backend/.env`:

```env
DB_ENV=local
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
```

When `DB_ENV=local` is set, the backend uses `DATABASE_URL_LOCAL` instead of `DATABASE_URL`.

**3. Start the dev server**

```bash
make dev   # backend connects to local PostgreSQL on port 5433
```

> **Important:** Use `make dev`, not `make up`. The Docker API container (`make up`) does not have `DB_ENV` in its environment and cannot reach `localhost:5433` from inside the container.

**Test credentials (seeded automatically):**

| Field  | Value              |
|--------|--------------------|
| Email  | `test@gymgate.com` |
| Password  | `Test1234!`        |

**Stopping / resetting:**

```bash
make local-down    # stop the PostgreSQL container (data preserved in volume)
make local-reset   # wipe all data, re-apply migrations, re-seed from scratch
```

---

## Option C — Docker API container + remote database

Use this to run the backend exactly as it would run in production (compiled, no hot reload), but still pointing at an external database.

**1. Set `.env`** (same as Option A)

**2. Start the container**

```bash
make up        # docker-compose up --build -d
make logs      # follow logs
```

The container runs `prisma migrate deploy` then `npm run build && npm run start` on startup.

**3. Run additional DB commands inside the container**

```bash
make docker-migrate   # prisma migrate deploy inside container
make docker-seed      # seed inside container
```

**4. Stop the container**

```bash
make down
```

---

## Quick reference — all Make targets

```
make help             # list all targets with descriptions

# Docker API container
make up               # build + start container (detached)
make down             # stop + remove container
make build            # rebuild image without starting
make logs             # follow container logs
make restart          # restart running container

# DB – local dev (uses .env directly)
make migrate          # prisma migrate deploy (remote DB)
make migrate-dev      # create new migration (dev)
make migrate-reset    # reset DB and replay all migrations  ⚠ destroys data
make seed             # seed the remote database

# DB – inside running container
make docker-migrate   # prisma migrate deploy inside container
make docker-seed      # seed inside container

# Local PostgreSQL (port 5433, DB_ENV=local workflow)
make local-setup      # one-time: start container + migrate + seed
make local-up         # start PostgreSQL container only
make local-down       # stop container (data preserved)
make local-migrate    # apply migrations to local DB
make local-seed       # seed local DB (exercises + plans + test user history)
make local-reset      # wipe local DB, re-apply migrations, re-seed

# Dev / quality
make dev              # start backend in watch mode (tsx + nodemon)
make test             # vitest
make typecheck        # tsc --noEmit
make clean            # remove dist/
```

---

## Environment variables

| Variable             | Required          | Description |
|----------------------|-------------------|-------------|
| `DATABASE_URL`       | yes               | Prisma connection URL (may go through a pooler) |
| `DIRECT_URL`         | yes               | Direct PostgreSQL URL used for migrations |
| `JWT_SECRET`         | yes               | Secret used to sign JWT tokens |
| `API_PORT`           | yes               | Port the Express server listens on (default `3000`) |
| `NODE_ENV`           | no                | `development` or `production` |
| `DB_ENV`             | no                | Set to `local` to use `DATABASE_URL_LOCAL` instead of `DATABASE_URL` |
| `DATABASE_URL_LOCAL` | when `DB_ENV=local` | Connection URL for local PostgreSQL on port 5433 |

`DATABASE_URL` and `DIRECT_URL` can be identical when connecting directly to PostgreSQL. They differ when `DATABASE_URL` points to a connection pooler (PgBouncer / Prisma Accelerate).
