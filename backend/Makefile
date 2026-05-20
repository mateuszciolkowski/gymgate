.PHONY: help \
        up down build logs restart \
        migrate migrate-dev migrate-reset seed \
        docker-migrate docker-seed \
        local-up local-down local-setup local-migrate local-seed local-reset \
        dev test typecheck \
        clean

LOCAL_DB_URL := postgresql://postgres:postgres@localhost:5433/gymgate_local

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────────────────────────

up: ## Build image and start container (detached)
	docker-compose up --build -d

down: ## Stop and remove container
	docker-compose down

build: ## Rebuild image without starting
	docker-compose build

logs: ## Follow container logs
	docker-compose logs -f gg_api

restart: ## Restart the running container
	docker-compose restart gg_api

# ── Database – local (requires .env with DATABASE_URL) ───────────────────────

migrate: ## Run pending migrations locally
	npx prisma migrate deploy

migrate-dev: ## Create a new migration (dev only)
	npx prisma migrate dev

migrate-reset: ## Reset DB and re-apply all migrations (dev only – destroys data)
	npx prisma migrate reset

seed: ## Seed the database locally
	npm run seed

# ── Database – inside running container ───────────────────────────────────────

docker-migrate: ## Run pending migrations inside the container
	docker-compose exec gg_api npx prisma migrate deploy

docker-seed: ## Seed the database inside the container
	docker-compose exec gg_api npm run seed

# ── Local Test Database (Docker PostgreSQL na porcie 5433) ───────────────────
#
#   Przełącznik: zmień DB_ENV=local w .env żeby app używał tej bazy.
#   Dane są trwałe — przetrwają restart kontenera (Docker volume).
#
#   Typowy workflow:
#     make local-setup   ← jednorazowo: start + migracje + seed
#     (w .env: DB_ENV=local)
#     make dev           ← backend łączy się z lokalną bazą
#     make local-down    ← zatrzymaj kontener gdy nie potrzebujesz

local-up: ## Start local PostgreSQL container (PORT 5433, data persisted in volume)
	docker-compose -f docker-compose.local.yml up -d --wait
	@echo "✅ Local PostgreSQL is ready on port 5433"

local-down: ## Stop local PostgreSQL container (data preserved in Docker volume)
	docker-compose -f docker-compose.local.yml down

local-migrate: ## Apply all Prisma migrations to local database (PORT 5433)
	DATABASE_URL=$(LOCAL_DB_URL) DIRECT_URL=$(LOCAL_DB_URL) npx prisma migrate deploy

local-seed: ## Seed local database: global exercises + built-in plans + test user workout history
	DB_ENV=local npm run seed
	npm run seed:local

local-setup: local-up local-migrate local-seed ## Full local DB setup: start + migrate + seed (run once)
	@echo ""
	@echo "✅ Local DB ready! Now set DB_ENV=local in .env and run: make dev"

local-reset: local-migrate local-seed ## Re-apply migrations and re-seed local database

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start backend in watch mode (tsx + nodemon)
	npm run dev

# ── Quality ───────────────────────────────────────────────────────────────────

test: ## Run all tests (vitest)
	npm test

typecheck: ## TypeScript type-check without emitting
	npm run typecheck

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf dist
