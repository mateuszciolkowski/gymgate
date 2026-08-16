.PHONY: help dev build preview lint typecheck test check ci clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start Vite dev server (port 5173)
	npm run dev

preview: ## Preview production build locally
	npm run preview

build: ## Type-check + production build
	npm run build

# ── Quality ───────────────────────────────────────────────────────────────────

lint: ## ESLint
	npm run lint

typecheck: ## TypeScript type-check without emitting
	npm run typecheck

test: ## Run all tests (vitest)
	npm test

check: ## Run full verification: lint + type-check + tests + build
	npm run lint
	npm run typecheck
	npm test
	npm run build

# ── CI (odzwierciedla .github/workflows/frontend-ci.yml – bez testów) ────────

ci: ## npm ci + typecheck + build (mirrors CI pipeline)
	npm ci
	npm run typecheck
	npm run build

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf dist
