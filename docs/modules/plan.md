# Moduł: Plan

## Odpowiedzialność

Zarządzanie planami treningowymi (`WorkoutPlan`) — szablonami ćwiczeń, które użytkownik może przypisać do treningu. Moduł obsługuje CRUD planów, duplikację oraz integrację z `WorkoutDetailScreen` (suggest / skip).

## Modele domenowe

```
WorkoutPlan
  id, name, creatorUserId? (null = built-in), isPublic
  → items: WorkoutPlanItem[]

WorkoutPlanItem
  id, planId, exerciseId, orderInPlan
  UNIQUE(planId, exerciseId)  ← ćwiczenie może wystąpić raz w planie
```

**Widoczność planów:**

| Typ | `creatorUserId` | Dostępny dla |
|---|---|---|
| Built-in | `null` | Wszyscy użytkownicy |
| Własny | `<userId>` | Tylko właściciel |
| Publiczny | `<userId>` + `isPublic=true` | Wszyscy użytkownicy (read + duplicate) |

## Endpointy (wszystkie wymagają authMiddleware)

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/plans?tab=mine\|builtin\|community` | Lista planów z filtrem zakładki |
| GET | `/api/plans/:id` | Szczegóły (items + exercise); dostępny jeśli widoczny dla usera |
| POST | `/api/plans` | Utwórz plan (właściciel = bieżący user) |
| PUT | `/api/plans/:id` | Zastąp items / zmień nazwę / isPublic (tylko właściciel) |
| DELETE | `/api/plans/:id` | Usuń plan (tylko właściciel); cascade na items, SetNull na workouts |
| POST | `/api/plans/:id/duplicate` | Prywatna kopia widocznego planu |

## Walidacja Zod

- `name`: 3–100 znaków, unikalna per user (`UNIQUE(creatorUserId, name)` w DB)
- `exerciseIds`: 1–50 UUID, bez duplikatów
- `isPublic=true`: wszystkie exercises muszą mieć `creatorUserId IN (null, "1")` — backend zwraca `400` z listą prywatnych ćwiczeń

## Kluczowe przepływy

### Tworzenie planu

```
POST /api/plans
  ↓ assertExercisesExistAndPublic(ids, requirePublic)   ← jeden fetch, dwa warunki
  ↓ assertNameAvailable(userId, name)
  ↓ repository.create() owinięte w runCreateWithUniqueGuard()
       ← guard mapuje Prisma P2002 (race condition) na 409
  ↓ 201 { data: WorkoutPlan z items[] }
```

### Aktualizacja planu

Strategia items: **replace-all transakcyjnie** (`deleteMany` + `createMany`). Jeśli `exerciseIds` nie podano — items nienaruszone.

```
PUT /api/plans/:id
  ↓ assertExercisesExistAndPublic(newIds, nextIsPublic) jeśli nowe ids
    assertExercisesArePublic(currentIds)                jeśli tylko isPublic się zmienia
  ↓ assertNameAvailable() jeśli name != currentName
  ↓ $transaction: deleteMany items → createMany items → update plan
  ↓ 200 { data: WorkoutPlan }
```

### Duplikacja

```
POST /api/plans/:id/duplicate
  ↓ getPlanById() ← sprawdza widoczność (własny | built-in | cudzy public)
  ↓ findFreeCopyName(): „<original> (kopia)" → „(kopia 2)" → ... → max 999
  ↓ repository.create() z isPublic=false, creatorUserId=userId
  ↓ 201 { data: WorkoutPlan }
```

## Integracja z treningiem (workout plan flow)

Szczegółowy opis przepływu po stronie frontendu → [`workout.md#integracja-z-planem`](./workout.md#integracja-z-planem).

Endpointy workout używane w tej integracji:

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/workouts` | `workoutPlanId?` w body — przypisuje plan do treningu |
| GET | `/api/workouts/:id/next-from-plan` | Pierwsze nieukończone ćwiczenie z planu |
| POST | `/api/workouts/:id/skip-plan-exercise` | Dodaj `exerciseId` do `skippedPlanExerciseIds` (idempotentne) |

## Offline

- **Plan CRUD (create / update / delete / duplicate)** — wymaga połączenia sieciowego; funkcje rzucają błąd natychmiast gdy offline
- **Plan suggestion + skip** — działa w pełni offline: `nextFromPlan` jest wyliczany lokalnie z `DataContext.plans`, `skipPlanExercise` stosuje optimistic update + IndexedDB, request do API jest wysyłany gdy sieć jest dostępna; rollback na błąd API

## Pliki

```
backend/src/modules/plan/
  plan.routes.ts
  plan.controller.ts
  plan.service.ts      ← CRUD, duplikacja, walidacja isPublic, race condition guard
  plan.repository.ts   ← findAll (3 taby), findById, create, update ($transaction), delete
  plan.schema.ts       ← Zod: createPlanSchema, updatePlanSchema, listPlansSchema
  plan.service.test.ts ← 16 testów: CRUD, walidacja, duplikacja, autoryzacja
  API.md               ← szczegółowe req/res kontrakty
```
