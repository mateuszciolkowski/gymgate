# ADR-003 – Offline-first with IndexedDB

**Status:** Accepted  
**Date:** 2024

## Context

The application is used at the gym, where internet connectivity may be unstable or completely unavailable. The user must be able to log sets and edit workouts without interruptions.

## Decision

An **offline-first** strategy based on IndexedDB as a local, persistent data store was adopted. All mutations use optimistic updates; operations that fail due to lack of connectivity are queued in IndexedDB and synchronized after reconnection via `SyncManager`.

## Rationale

- **IndexedDB** – built into browsers, requires no library, supports large structured datasets (unlike `localStorage` with its ~5 MB limit).
- **Optimistic update** – immediate UI response without waiting for a server response improves user experience in weak Wi-Fi environments.
- **pendingSync queue** – FIFO operation queue enables replaying state in the correct order after reconnection.
- **temp ID mapping** – temporary UUIDs (`temp_*`) are replaced with real IDs from the server after synchronization, allowing subsequent operations to depend on previous ones.

## Consequences

- `SyncManager` implementation is complex (temp ID replacement, retry logic, conflict detection).
- Offline operations on entities depending on unsaved entities (e.g. `addSet` when `workoutItem` has a temp ID) require special handling via `hasUnresolvedTempIds`.
- After exceeding `MAX_RETRIES = 3`, an operation is marked as permanently failed; `SyncFailureBanner` is then displayed.
- Conflict resolution is not implemented (last-write-wins during synchronization).

## Alternatives Considered

- **Service Worker + Cache API** – suitable mainly for static assets; for dynamic data, IndexedDB offers greater flexibility.
- **Library (PouchDB, RxDB, Dexie)** – skipped to avoid external dependencies; the custom `localStore` covers the needs of the current data model.
- **No offline support** – excluded as incompatible with UX requirements.
