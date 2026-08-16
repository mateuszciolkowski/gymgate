.PHONY: dev ci check test up down

dev: ## Start backend in watch mode (run frontend dev in a second shell: make -C frontend dev)
	$(MAKE) -C backend dev

up: ## Start local Postgres for backend dev
	$(MAKE) -C backend local-up

down: ## Stop local Postgres
	$(MAKE) -C backend local-down

check: ## Full verification for backend + frontend
	$(MAKE) -C backend check
	$(MAKE) -C frontend check

test: ## Run all tests, backend + frontend
	$(MAKE) -C backend test
	$(MAKE) -C frontend test

ci: ## Mirror CI pipelines for backend + frontend
	$(MAKE) -C backend ci
	$(MAKE) -C frontend ci
