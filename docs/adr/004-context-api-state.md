# ADR-004 – Context API Instead of External State Manager

**Status:** Accepted  
**Date:** 2024

## Context

The frontend requires global state for domain data (workouts, exercises, statistics) and session state. Available options in the React ecosystem include Redux Toolkit, Zustand, Jotai, or the native Context API.

## Decision

Only **React Context API** (`AuthContext` + `DataContext`) is used – without any external state library.

## Rationale

- **Simplicity** – the project has a single main data flow; two contexts (`AuthContext`, `DataContext`) fully cover the needs.
- **Zero dependencies** – no additional packages reduces bundle size and risk of breaking changes.
- **Consistency with React 19** – native React capabilities (Actions, `useOptimistic`) do not require an adapter.
- **Readability** – `DataContext` exposes a clearly defined interface (`DataContextType`) with all actions.

## Consequences

- `DataContext` is a monolithic file (~1800 LOC) – requires discipline when extending.
- Every state change in `DataContext` re-renders all consumers; `useCallback`, `useMemo`, and `useRef` are used to limit unnecessary re-renders.
- `exercisesRef`, `workoutsRef`, `statsRef` – refs used in callbacks to avoid stale closures without expanding `useEffect` dependency arrays.

## Alternatives Considered

- **Zustand** – skipped as unnecessary for the current scale; can be reconsidered for further expansion.
- **Redux Toolkit** – skipped as over-engineering for this application.
- **Jotai / Recoil** – atomic state model incompatible with the current global store structure.
