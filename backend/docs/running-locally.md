# Running the backend locally

There are three ways to run the backend depending on whether you want a fully local setup or connect to a remote database.

---

## Option A – Local dev server + remote database (simplest)

Use this when the database already lives on Railway, Supabase, or any other hosted PostgreSQL.

**1. Install dependencies**

```bash
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

## Option B – Local dev server + local PostgreSQL (fully offline)

Use this when you want a completely self-contained setup without any external service.

**1. Start a local PostgreSQL instance**

The quickest way is Docker (just the database, not the full app):

```bash
docker run -d \
  --name gymgate-db \
  -e POSTGRES_USER=gymgate \
  -e POSTGRES_PASSWORD=gymgate \
  -e POSTGRES_DB=gymgate \
  -p 5432:5432 \
  postgres:16-alpine
```

**2. Set `.env` to point at the local instance**

```env
DATABASE_URL="postgresql://gymgate:gymgate@localhost:5432/gymgate"
DIRECT_URL="postgresql://gymgate:gymgate@localhost:5432/gymgate"
JWT_SECRET="some-strong-secret"
NODE_ENV=development
API_PORT=3000
```

**3. Run migrations and (optionally) seed**

```bash
make migrate
make seed
```

**4. Start the dev server**

```bash
make dev
```

---

## Option C – Full Docker setup (backend + connects to remote DB)

Use this to run the backend exactly as it would run in production (compiled, no hot reload), but still pointing at an external database.

**1. Set `.env`** (same as Option A)

**2. Start the container**

```bash
make up        # docker-compose up --build -d
make logs      # follow logs
```

The container runs `prisma migrate deploy && npm run build && npm run start` on startup, so migrations apply automatically.

**3. Run additional DB commands inside the container**

```bash
make docker-migrate   # prisma migrate deploy inside container
make docker-seed      # seed inside container
```

Use the `docker-*` targets whenever the database is only reachable through the container's network (e.g., when the DB URL is only set as a Docker env var and not in your local `.env`).

**4. Stop the container**

```bash
make down
```

---

## Quick reference – all Make targets

```
make help           # list all targets with descriptions

# Docker
make up             # build + start container (detached)
make down           # stop + remove container
make build          # rebuild image without starting
make logs           # follow container logs
make restart        # restart running container

# DB – local (uses local .env)
make migrate        # prisma migrate deploy
make migrate-dev    # create new migration (dev)
make migrate-reset  # reset DB and replay all migrations  ⚠ destroys data
make seed           # seed the database

# DB – inside container (container must be running)
make docker-migrate # prisma migrate deploy inside container
make docker-seed    # seed inside container

# Dev / quality
make dev            # start in watch mode
make test           # vitest
make typecheck      # tsc --noEmit
make clean          # remove dist/
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection URL (may go through a pooler) |
| `DIRECT_URL` | yes | Direct PostgreSQL URL used for migrations |
| `JWT_SECRET` | yes | Secret used to sign JWT tokens |
| `API_PORT` | yes | Port the Express server listens on (default `3000`) |
| `NODE_ENV` | no | `development` or `production` |

Both URLs can be identical when connecting directly to PostgreSQL. They differ when `DATABASE_URL` points to a connection pooler (PgBouncer / Prisma Accelerate).
