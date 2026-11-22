# Mobile – CLAUDE.md

> Subproject guide for the GymGate native app. For the whole-project picture (two clients, one backend; bug and feature rules) see [`../CLAUDE.md`](../CLAUDE.md).

## Stack

Expo SDK 58 (New Architecture) · React Native 0.88 · React 19 · expo-router · TypeScript strict · expo-sqlite + Drizzle (local DB) · Reanimated 4 + react-native-worklets · react-native-gesture-handler · expo-widgets + @expo/ui (Live Activity) · Jest (jest-expo) + React Native Testing Library · Maestro (E2E, `.maestro/`).

**Node 24** (`export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`); `backend/` and `frontend/` stay on Node 20.

## Layout

```
app/                    – expo-router routes: (auth)/, (app)/(tabs)/{trainings,exercises,stats,plans,settings}, (app)/workout/[id], forms
src/
  domain/               – pure logic ported from the PWA (+ local stats). Counterpart of frontend/src/utils + contexts logic
  db/                   – SQLite schema, migrations, repositories. Every write = one transaction incl. the outbox row
  sync/                 – outbox, push, pull, sync engine, rejected-change issues (protocol: backend/src/modules/sync/API.md)
  session/ api/         – mobile sessions (1 h access token, rotating refresh token), HTTP client
  providers/            – SessionProvider, DbProvider (useDbQuery, useAction), SyncProvider
  features/             – screens per area: workouts, exercises, plans, stats, settings, sync, liveActivity
  theme/ ui/            – 12 generated themes, shared components, icons (PWA SVG paths)
docs/                   – STATUS, PLAN, PARYTET (parity checklist), DECYZJE (decisions), DLA_MATEUSZA (owner notes)
```

## Core patterns

- **Offline-first.** Screens never call the network. Writes go through `useAction(ctx => repository(ctx, …))`: local DB + outbox in one transaction; the sync engine pushes later. Reads go through `useDbQuery(read, active)`.
- **Live queries re-run on every DB change.** Heavy reads (full workout history) must not run on every set save: pass `useIsFocused()` as `active` on tab screens, and memoize history-derived data by the inputs that really change it (see `useWorkoutScreen`).
- **Per-second timers** live in tiny components (`WorkoutTimerText`), never in a whole screen's state.
- **Parity with the PWA.** A new feature or fix goes into both clients (root `CLAUDE.md`). The counterpart of a mobile domain function is usually in `frontend/src/utils/` or `frontend/src/contexts/data/`; keep the same rule and the same test cases. Record deliberate differences in `docs/DECYZJE.md`.

## Gotchas (learned the hard way)

- **Worklets:** any function called inside a gesture/animation worklet must itself have `"worklet"` (e.g. `drawerMath.ts`). A plain JS function there crashes **Release** builds instantly; dev builds may not show it.
- **Live Activity layout** (`src/features/liveActivity/activity.tsx`) runs in the widget extension: no hooks, no module scope, one-line texts (`lineLimit(1)`), SF Symbols instead of emoji. A system timer text reserves room for its longest value: pin it with `frame({ width, alignment })` + `multilineTextAlignment("trailing")`.
- **Live Activity buttons** run in the (possibly backgrounded) app: after the write, push the new content immediately (`readActivity` + `reconcile`), React will not re-render until the app is opened.
- `ios/` and `android/` are generated (`npx expo prebuild`), never edit them by hand; config lives in `app.json` and plugins.
- `mobile/.env` (`EXPO_PUBLIC_API_URL`) is inlined at build time. It may point at **production** (`https://gymgate-api.mateuszciolkowski.pl`) for phone builds; switch it to `http://localhost:3000` before simulator work against the local backend, and rebuild/restart Metro.

## Commands

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm test              # jest
npm run test:protocol # sync protocol against a local backend
npm run test:parity   # local stats vs server, against a local backend
npm start             # Metro for the dev client (simulator)
```

Physical iPhone (Release, free Apple ID, team `8SQ4UJ93FG`, bundle id `pl.mateuszciolkowski.gymgate`):

```bash
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace GymGate.xcworkspace -scheme GymGate -configuration Release \
  -destination id=<device UDID> -derivedDataPath build -allowProvisioningUpdates build
xcrun devicectl device install app --device <device UDID> build/Build/Products/Release-iphoneos/GymGate.app
```

Crash logs from the phone: `xcrun devicectl device info files --device <UDID> --domain-type systemCrashLogs`, then `device copy from`.

## More

- Owner-facing setup and device tests → `docs/DLA_MATEUSZA.md`
- Backend deployment checklist and rollback → `docs/WDROZENIE_BACKENDU.md`
- Versions, themes, scripts → `README.md`
