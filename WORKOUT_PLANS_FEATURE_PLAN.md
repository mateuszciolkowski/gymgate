# Plan: Workout Plans (Custom + Built-in)

## Cel

Wprowadzenie systemu szablonów treningowych (workout plans):
- predefiniowana biblioteka built-in (2 plany FBW: 3-day dla mężczyzn, 2-day dla kobiet),
- możliwość tworzenia własnych planów (CRUD),
- opcjonalne udostępnianie planów publicznie,
- start treningu „z planu" (workout startuje pusty, z referencją do planu),
- akcja „następne ćwiczenie z planu" + „pomiń to ćwiczenie" w `WorkoutDetailScreen`,
- zachowanie istniejącej semantyki dodawania ćwiczenia do workoutu (1 default set, weight/reps z `ExerciseUserStats`).

---

## Decyzje architektoniczne

| # | Aspekt | Decyzja |
|---|---|---|
| 1 | Struktura planu | Jedna uporządkowana lista ćwiczeń (FBW-A/B/C jako osobne plany) |
| 2 | Built-in plans | 2 plany w seedzie: FBW 3-day M, FBW 2-day K |
| 3 | CRUD | Pełny: create / list / read / update / delete |
| 4 | Duplikaty exercise w planie | Niedozwolone (`@@unique([planId, exerciseId])`) |
| 5 | Public | Flag `isPublic` per plan |
| 6 | Widoczność public | Wszyscy + możliwość duplikacji do swoich |
| 7 | Start z planu | Z dowolnego widocznego planu (built-in / własny / cudzy public) |
| 8 | Workout startuje | Pusty + `workoutPlanId` zapisany |
| 9 | Referencja vs snapshot | Live — workout widzi aktualny stan planu |
| 10 | Duplikacja | Pełna kopia (nazwa + lista ćwiczeń) |
| 11 | Suggest UX | Jeden przycisk `[+ Następne: <nazwa>] [⏭]` |
| 12 | Skip — semantyka | Pomija tylko w tym workoucie, plan nietknięty, można dalej dodać manualnie |
| 13 | Skip state | Backend: `Workout.skippedPlanExerciseIds: String[]` |
| 14 | Prywatne exercises w planie | Podejście D: blokada `isPublic=true` jeśli plan zawiera prywatne |
| 15 | Lifecycle usunięcia planu | `onDelete: SetNull` na `Workout.workoutPlanId` |
| 16 | Nawigacja | Nowa pozycja „Plany" w drawer |
| 17 | Start workout UI | Dropdown w `WorkoutFormModal` |
| 18 | Plan form UI | Pełny screen (`PlanFormScreen`) |
| 19 | Lista planów | Tabs: Moje / Built-in / Społeczność |
| 20 | isPublic toggle | Checkbox w formularzu |
| 21 | Reorder | Drag-and-drop (`@dnd-kit/sortable`) |
| 22 | Walidacja | Min 1 exercise, max 50, nazwa 3–100 znaków, unikalna per user |
| 23 | Offline | Pełen offline (IndexedDB + optimistic update + syncManager) |

---

## Compatibility guardrail

Dodawanie ćwiczeń sugerowanych z planu MUSI używać istniejącej funkcji `addExerciseToWorkout` (workout service). Ta funkcja gwarantuje:

- utworzenie `WorkoutItem` z `previousNote` (z `ExercisePendingNote`),
- utworzenie 1 domyślnej serii z `weight = stats.lastWeight ?? 0`, `reps = stats.lastReps ?? 1`,
- konsumpcję pending note.

Nie wolno dublować tej logiki w handlerze „suggest next" — reuse istniejącego endpointu `POST /api/workouts/:id/exercises`.

---

## Etap 1 — Backend (PR #1)

### Schema Prisma

```prisma
model WorkoutPlan {
  id            String   @id @default(uuid())
  name          String
  creatorUserId String?  // null = built-in
  isPublic      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  creator  User?             @relation(fields: [creatorUserId], references: [id], onDelete: Cascade)
  items    WorkoutPlanItem[]
  workouts Workout[]

  @@unique([creatorUserId, name])
  @@map("workout_plans")
}

model WorkoutPlanItem {
  id          String @id @default(uuid())
  planId      String
  exerciseId  String
  orderInPlan Int

  plan     WorkoutPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  exercise Exercise    @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([planId, exerciseId])
  @@map("workout_plan_items")
}
```

### Workout — nowe pola

```prisma
model Workout {
  // ...istniejące pola...
  workoutPlanId          String?
  skippedPlanExerciseIds String[]  @default([])

  plan WorkoutPlan? @relation(fields: [workoutPlanId], references: [id], onDelete: SetNull)
}
```

### Nowy moduł `backend/src/modules/plan/`

Pełna warstwa zgodna z istniejącym wzorcem: `routes → controller → service → repository`.

**Pliki:**
- `plan.routes.ts`
- `plan.controller.ts`
- `plan.service.ts`
- `plan.repository.ts`
- `plan.schema.ts` (Zod)
- `plan.service.test.ts`
- `API.md`

**Endpointy:**

| Metoda | Path | Opis |
|---|---|---|
| GET | `/api/plans?tab=mine\|builtin\|community` | Lista planów z filtrem zakładki |
| GET | `/api/plans/:id` | Szczegóły z items[] (włącznie z exercise) |
| POST | `/api/plans` | `{ name, exerciseIds: string[], isPublic: boolean }` |
| PUT | `/api/plans/:id` | Edycja (tylko właściciel) |
| DELETE | `/api/plans/:id` | Usunięcie (tylko właściciel) |
| POST | `/api/plans/:id/duplicate` | Pełna kopia do moich planów |

### Walidacja Zod

- `name`: string, 3–100 znaków, unikalna per user (`@@unique([creatorUserId, name])`)
- `exerciseIds`: array, min 1, max 50, bez duplikatów
- `isPublic`: jeśli `true` → wszystkie exerciseIds muszą mieć `creatorUserId=null` (globalne). W przeciwnym razie 400 z listą problematycznych ćwiczeń.

### Workout integration

Rozszerzenie `workout.service` / `workout.controller`:

| Metoda | Path | Opis |
|---|---|---|
| POST | `/api/workouts` | Rozszerzone DTO o `workoutPlanId?` |
| GET | `/api/workouts/:id/next-from-plan` | `{ exerciseId, exerciseName } \| null` |
| POST | `/api/workouts/:id/skip-plan-exercise` | `{ exerciseId }` → dodanie do `skippedPlanExerciseIds` |

**Algorytm „next from plan":**

```
plan.items
  .sort(orderInPlan asc)
  .filter(item => !workout.items.some(i => i.exerciseId === item.exerciseId))
  .filter(item => !workout.skippedPlanExerciseIds.includes(item.exerciseId))
  .first()
```

### Seed (`prisma/seed.ts`)

Placeholder dla 2 built-in planów (FBW 3-day M, FBW 2-day K).
**⚠️ Otwarta zależność**: konkretne listy ćwiczeń dostarczy user. Weryfikacja: wszystkie exerciseIds muszą być globalne (`creatorUserId=null`). Brakujące dodajemy w seedzie jako globalne.

### Testy

- `plan.service.test.ts`: CRUD + walidacja (min/max/unique/isPublic z prywatnymi) + duplicate
- Update `workout.service.test.ts`: test scenariuszy next-from-plan + skip + integration z `addExerciseToWorkout`

### Dokumentacja

- `backend/src/modules/plan/API.md` (nowy)
- Update `backend/src/modules/workout/API.md`
- Update `other/GymGate_API.postman_collection.json`

**Szacowany zakres**: ~12 plików.

---

## Etap 2 — Frontend CRUD (PR #2)

### Typy

```ts
// types/workout.ts
export interface WorkoutPlan {
  id: string;
  name: string;
  creatorUserId: string | null;
  isPublic: boolean;
  items: WorkoutPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutPlanItem {
  id: string;
  planId: string;
  exerciseId: string;
  orderInPlan: number;
}
```

### DataContext slice

- State: `plans: WorkoutPlan[]`
- Akcje: `loadPlans()`, `createPlan()`, `updatePlan()`, `deletePlan()`, `duplicatePlan()`
- Każda mutacja: optimistic update + IndexedDB write + syncManager queue (zgodnie z istniejącym wzorcem dla workouts/exercises)
- `idMappingRef` dla `temp_*` → real ID po sukcesie API

### Nowe komponenty / screeny

| Plik | Rola |
|---|---|
| `PlansScreen.tsx` | Lista z tabs (Moje / Built-in / Społeczność), CTA „Stwórz plan", karty planów |
| `PlanFormScreen.tsx` | Tworzenie/edycja: nazwa, checkbox isPublic (z walidacją D), drag-and-drop lista, `ExerciseSelectionModal` |
| `PlanDetailScreen.tsx` | View-only dla cudzych public (read-only + przycisk „Duplikuj do moich") |

### Nawigacja

- Pozycja „Plany" w głównym drawer (`MenuScreen` lub odpowiedni config drawer)
- Routing w istniejącym custom state-routerze

### Biblioteki

- Instalacja: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Szacowany zakres**: ~8 plików frontend.

---

## Etap 3 — Integracja workout flow (PR #3)

### `WorkoutFormModal`

- Dodanie pola „Plan (opcjonalny)" — dropdown z listą widocznych planów (`mine` + `builtin` + `community`)
- Wybór zapisuje `workoutPlanId` w body `POST /api/workouts`

### `WorkoutDetailScreen`

Gdy `workout.workoutPlanId` ≠ null:

1. Wyliczanie `nextFromPlan` na froncie (live):
   - Bierzemy `plan.items` (z `DataContext.plans`)
   - Filtrujemy te, które są już w `workout.items` (po `exerciseId`)
   - Filtrujemy te w `workout.skippedPlanExerciseIds`
   - Bierzemy pierwszy z pozostałych
2. UI:
   - Jeśli istnieje `nextFromPlan`: `[+ Następne: <nazwa>] [⏭ pomiń]` powyżej listy ćwiczeń
   - Klik główny → `addExercise(nextFromPlan.exerciseId)` (reuse istniejącej funkcji = guardrail spełniony)
   - Klik skip → optimistic add do `skippedPlanExerciseIds` + `POST /api/workouts/:id/skip-plan-exercise`
   - Brak `nextFromPlan` → tekst „Plan ukończony — możesz dodawać ręcznie"
3. Manualny `ExerciseSelectionModal` działa równolegle bez modyfikacji

### Testy ręczne (smoke)

- [ ] Start workout z built-in plan → suggest next → add → suggest następne działa
- [ ] Skip → następne sugeruje kolejne, pominięte nadal w `plan.items` ale nie sugerowane
- [ ] Po skip można dodać pominięte ćwiczenie przez manualny modal
- [ ] Manual add ćwiczenia spoza planu → suggest next dalej działa
- [ ] Offline: start workout z planu, add/skip, sync online — stan zachowany
- [ ] Plan wyczerpany → przycisk znika, tekst informacyjny
- [ ] Edycja planu w trakcie trwającego workoutu z planu → suggest reaguje na zmianę (live)
- [ ] Walidacja: `isPublic=true` z prywatnym exercise → blokada z komunikatem

**Szacowany zakres**: ~4 pliki frontend.

---

## Łączny zakres

| Etap | Pliki | PR |
|---|---|---|
| Backend | ~12 | #1 |
| Frontend CRUD | ~8 | #2 |
| Workout integration | ~4 | #3 |
| **Razem** | **~24** | **3** |

Zakres znacznie powyżej progu mc-dev (5 plików), stąd podział na 3 PR-y.

---

## Otwarta zależność

**Czekam na listy ćwiczeń** dla 2 built-in planów (FBW 3-day M, FBW 2-day K).
Verification step: każdy podany exercise musi istnieć w bazie jako globalny (`creatorUserId=null`). Brakujące dodajemy do seeda jako globalne, żeby built-in plany działały out-of-the-box.

---

## Stan dokumentu

- Status: **plan zatwierdzony, czeka na start implementacji etapu 1**
- Data utworzenia: 2026-05-14
- Następny krok: PR #1 (backend) — po dostarczeniu list ćwiczeń lub z placeholder seed
