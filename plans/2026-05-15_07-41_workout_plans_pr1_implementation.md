# PR #1 — Backend Workout Plans — Plan implementacji

Referencja: [`2026-05-14_21-26_workout_plans_feature.md`](./2026-05-14_21-26_workout_plans_feature.md) (PR #50)

## Zakres

Etap 1 (PR #1 backend) — ~13 plików, 1 PR. Branch oparty na `origin/docs/workout-plans-feature-plan`.

## Konwencja istotna

`creatorUserId = null` → globalne. `creatorUserId = "1"` → built-in user (już istniejący w seedzie, traktowany jako default dostępny dla każdego — patrz `exercise.repository.ts:11-14`). Oba traktowane jako „dostępne dla każdego" przy walidacji `isPublic=true`.

## Kolejność prac

### 1. Branch setup
```bash
git checkout -b feature/workout-plans-backend origin/docs/workout-plans-feature-plan
```

### 2. Schema Prisma + migracja (`backend/prisma/schema.prisma`)
- Nowe: `WorkoutPlan`, `WorkoutPlanItem`
- `Workout` += `workoutPlanId String?`, `skippedPlanExerciseIds String[] @default([])`, relacja `plan`
- `User` += relacja `workoutPlans WorkoutPlan[]`
- `npx prisma migrate dev --name add_workout_plans`

### 3. Moduł `backend/src/modules/plan/`
- `plan.schema.ts` — Zod
- `plan.repository.ts` — Prisma queries
- `plan.service.ts` — walidacja + autoryzacja
- `plan.controller.ts` — HTTP mapping
- `plan.routes.ts` — middleware + 6 endpointów
- Rejestracja w `backend/src/index.ts`

**Endpointy:**
| Metoda | Path | Opis |
|---|---|---|
| GET | `/api/plans?tab=mine\|builtin\|community` | Lista po tab |
| GET | `/api/plans/:id` | Szczegóły z items + exercise |
| POST | `/api/plans` | Create |
| PUT | `/api/plans/:id` | Update (replace items) |
| DELETE | `/api/plans/:id` | Delete (owner only) |
| POST | `/api/plans/:id/duplicate` | Pełna kopia |

**Filtry `tab`:**
- `mine`: `creatorUserId = userId`
- `builtin`: `creatorUserId IS NULL`
- `community`: `creatorUserId IS NOT NULL AND creatorUserId != userId AND isPublic = true`

### 4. Workout integration
- `workout.schema.ts` — `CreateWorkout` += `workoutPlanId?: string`
- `workout.repository.ts` — propagacja `workoutPlanId` w `create`; `addToSkipped`
- `workout.service.ts` — `nextFromPlan`, `skipPlanExercise`
- `workout.controller.ts` + `workout.routes.ts` — 2 nowe endpointy:
  - `GET /api/workouts/:id/next-from-plan` → `{ exerciseId, exerciseName } | null`
  - `POST /api/workouts/:id/skip-plan-exercise` → `{ exerciseId }`

**Algorytm `nextFromPlan`:**
```
plan.items
  .sort(orderInPlan asc)
  .filter(item => !workout.items.some(i => i.exerciseId === item.exerciseId))
  .filter(item => !workout.skippedPlanExerciseIds.includes(item.exerciseId))
  .first() || null
```

### 5. Seed: 5 built-in planów

**Nowe globalne ćwiczenie:**
- „Prostowanie ramienia na wyciągu jednorącz" (`TRICEPS`)

**Plany** (`creatorUserId=null`, `isPublic=true`):

#### FBW Mężczyzna - Trening A
1. Podciąganie na drążku nachwytem
2. Przysiady bułgarskie
3. Glute bridge
4. Wyciskanie hantli na ławce skośnej
5. Uginanie na modlitewniku
6. Wyciskanie francuskie hantlem

#### FBW Mężczyzna - Trening B
1. Wyciskanie sztangi nad głowę (OHP)
2. Wiosłowanie focze hantlami na ławce skośnej
3. Dipy na poręczach
4. Uginanie na ławce skośnej
5. Wspięcia na palce siedząc
6. Wznosy tułowia na ławce rzymskiej
7. Rozpiętki na maszynie

#### FBW Mężczyzna - Trening C
1. Wyciskanie sztangi na ławce płaskiej
2. Martwy ciąg klasyczny
3. Wypychanie nóg na suwnicy
4. Prostowanie ramienia na wyciągu jednorącz (NOWE)
5. Uginanie sztangi łamanej
6. Uginanie hantli młotkowe
7. Odwodzenie linki wyciągu jednorącz na tył barku

#### FBW Kobieta - Trening A
1. Przysiady bułgarskie
2. Glute bridge
3. Wznosy tułowia na ławce rzymskiej
4. Wiosłowanie na wyciągu dolnym
5. Uginanie hantli młotkowe
6. Wyciskanie francuskie hantlem
7. Unoszenie hantli bokiem

#### FBW Kobieta - Trening B
1. Martwy ciąg rumuński
2. Przysiad sumo
3. Ściąganie drążka wyciągu górnego
4. Odwodzenie nogi na maszynie
5. Wspięcia na palce siedząc
6. Prostowanie ramion na wyciągu z liną

### 6. Testy
- `plan.service.test.ts` — CRUD + walidacja (min/max nazwy, max 50 items, duplicate exerciseIds, isPublic z prywatnym, unique name per user) + duplicate + autoryzacja owner-only
- update `workout.service.test.ts` — `nextFromPlan` (pomija added/skipped, sort, null gdy ukończony), `skipPlanExercise` (idempotentne)

### 7. Dokumentacja
- `backend/src/modules/plan/API.md` (nowy)
- update `backend/src/modules/workout/API.md`
- update `other/GymGate_API.postman_collection.json`

### 8. Weryfikacja
```bash
cd backend
npx prisma generate
npm run build
npm test
```

## Decyzje techniczne

- **Update strategy dla items**: replace-all transakcyjnie (delete + recreate z `orderInPlan` = index). Prostsze niż diff, spójne z UX drag-and-drop.
- **Walidacja `isPublic=true`**: blok jeśli któryś exerciseId ma `creatorUserId NOT IN (null, "1")`. Response 400 z listą nazw.
- **`addToSkipped`**: idempotentne — push tylko gdy `!skipped.includes(exerciseId)`.
- **`@@unique([planId, exerciseId])`** (decyzja #4 z PR #50).
- **`onDelete`**: `WorkoutPlan` cascade na `creator`, `SetNull` na `Workout.workoutPlanId` (decyzja #15).

## Status

- 2026-05-14: plan zatwierdzony przez usera, start implementacji.
