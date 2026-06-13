# Frontend – CLAUDE.md

> Subproject guide for the GymGate web app. For the whole-project picture see [`../CLAUDE.md`](../CLAUDE.md).

## Stack

React 19 · Vite 7 · TypeScript · Tailwind CSS 4 · Context API (no Redux/Zustand) · IndexedDB for offline · `@dnd-kit` for drag-and-drop · Vitest (unit) + Playwright (e2e). Path alias `@/` → `src/`.

## Layout

```
src/
  main.tsx / App.tsx        – bootstrap + top-level providers
  contexts/
    AuthContext.tsx         – login/register/logout, JWT token in localStorage, offline fallback
    data/                   – the ONLY global data store, split into domain hooks:
      DataContext.tsx           – provider composing the hooks below
      useDataStore.ts           – state, refs, shared helpers (temp IDs, sync queue, stats cache)
      useDataSync.ts            – bootstrap from IndexedDB + SyncManager lifecycle
      useWorkoutActions.ts      – workout mutations
      useWorkoutItemActions.ts  – workout item / set mutations
      useExerciseActions.ts     – exercise mutations
      usePlanActions.ts         – plan mutations (online-only)
      hooks.ts                  – useData + selector hooks (useWorkoutData, ...)
      types.ts                  – DataContextType, WorkoutNotFoundError
  features/                 – feature-driven UI, each with components/ + barrel index.ts
    auth/ workouts/ exercises/ plans/ stats/ menu/
  components/               – shared UI only: ui/ icons/ layouts/ navigation/ app/
  hooks/                    – useNavigation (custom SPA router), useTheme
  utils/
    localStore.ts           – IndexedDB wrapper (stores: workouts, exercises, stats, plans, activeWorkout, pendingSync, metadata)
    syncManager.ts          – background sync (every 2 min) + offline operation queue + retry (max 3)
    auth.ts                 – authFetch (auto 401 handling) + getAuthHeaders
    workoutTimer.ts         – workout duration helper (has unit tests)
  config/api.ts             – API_BASE (single source; VITE_API_URL, default http://localhost:3000)
  types/                    – domain types (workout.ts, exercise.ts, ...)
  constants/                – muscleGroups, etc.
```

## Core patterns

- **Single global store** – `DataContext` holds `workouts[]`, `exercises[]`, `stats[]`, `plans[]`, `activeWorkoutId`. Nothing else is global.
- **Optimistic update** – every mutation: (1) update UI + IndexedDB immediately, (2) fire the API call, (3) on network error queue it in `pendingSync`, (4) on server error roll back. `SyncManager` replays the queue on reconnect.
- **Temp IDs** – offline-created entities get a `temp_*` id; `idMappingRef` / `SyncManager` remap them to real server IDs after a successful response.
- **Refs mirror state** – action callbacks read from `*Ref.current` (not state) to stay dependency-free and read values synchronously.
- **SPA router without a library** – `useNavigation` + `useState<Screen>` (screens: trainings, workout-detail, exercises, add/edit-exercise, stats, stats-exercise-detail, menu).
- **Plan suggestion** is computed on the frontend from `DataContext.plans` (no extra API call); `skipPlanExercise` works offline.

## Conventions

- **Comments + identifiers: English. User-facing strings: Polish** (UI text, `alert()`, user-facing errors) – do not translate.
- Add new global state only inside `contexts/data`; keep feature UI in `features/`, shared UI in `components/`.
- Use the `@/` alias for imports from `src/`.

## Commands

```bash
npm run dev          # Vite dev server, port 5173
npm run typecheck    # tsc -b
npm run build        # tsc -b && vite build
npm run lint         # eslint
npm test             # vitest run
```

> Known pre-existing lint debt: `react-hooks/set-state-in-effect` errors in `features/workouts/.../WorkoutItemCard.tsx` (setState inside useEffect). Not yet refactored.

## More

- Offline architecture deep-dive → [`docs/OFFLINE.md`](./docs/OFFLINE.md) and [`../docs/modules/offline-sync.md`](../docs/modules/offline-sync.md)
- System architecture → [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
