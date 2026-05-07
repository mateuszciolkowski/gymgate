.PHONY: help \
        up down build logs restart \
        migrate migrate-dev migrate-reset seed \
        docker-migrate docker-seed \
        dev test typecheck \
        clean

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
