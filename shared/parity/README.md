# Shared parity fixtures

Logic that exists in both clients (PWA `frontend/src/utils/`, app `mobile/src/domain/`) is tested against the same
cases here. Each client has one runner that loads every JSON file and checks its own implementation:

- PWA: `frontend/src/utils/parity.test.ts` (`npm test` in `frontend/`)
- App: `mobile/src/domain/parity.test.ts` (`npm test` in `mobile/`)

When you change shared behaviour, change the fixture first; both suites must pass. When you port a new function to
both clients, add a fixture file and a case in both runners.
