# GymGate Backend — Architektura

## Stos technologiczny

- **Node.js + Express + TypeScript** — serwer HTTP
- **Prisma** — ORM, klient PostgreSQL
- **PostgreSQL** — baza danych (Supabase w produkcji)
- **JWT** w httpOnly cookie — sesja użytkownika
- **Zod** — walidacja żądań
- **Vitest** — testy jednostkowe

## Warstwa sieciowa

Każde żądanie do zasobu chronionego przechodzi przez dwa middleware (w tej kolejności):

1. **`authMiddleware`** (`common/middleware/auth.ts`) — weryfikuje JWT z cookie, dołącza `req.user` do żądania
2. **`validate(schema)`** (`common/middleware/validate.ts`) — waliduje `req.body` / `req.query` przez Zod schema; zwraca `422` gdy dane nie przechodzą

## Podział modułów

```
modules/
  auth/       – rejestracja, login, wylogowanie
  user/       – profil użytkownika
  exercise/   – ćwiczenia (globalne + tworzone przez użytkownika)
  workout/    – treningi, pozycje, serie, statystyki
```

Każdy moduł posiada ściśle przestrzeganą warstwę:

```
routes → controller → service → repository
```

| Warstwa | Odpowiedzialność |
|---|---|
| `routes` | Router Express, middleware auth + validate |
| `controller` | Mapuje HTTP req/res, wywołuje service, zwraca odpowiedź |
| `service` | Logika biznesowa (walidacja, reguły domeny, koordynacja) |
| `repository` | Wyłącznie zapytania Prisma, zero logiki biznesowej |

## Modele danych

```
User
  └─ activeWorkoutId?        – wskazanie aktywnego treningu (nullable FK)

Workout
  └─ status: DRAFT | COMPLETED
  └─ items: WorkoutItem[]

WorkoutItem                  – jedno ćwiczenie wewnątrz treningu
  └─ notes                   – notatka do bieżącego treningu
  └─ previousNote            – notatka z poprzedniego treningu (one-time carry-over)
  └─ sets: WorkoutSet[]

WorkoutSet
  └─ setNumber, weight (Decimal), repetitions

ExerciseUserStats            – cache statystyk per użytkownik + ćwiczenie
  └─ maxWeight, lastWeight, lastReps, totalWorkouts, lastNote

ExercisePendingNote          – tabela przejściowa do przenoszenia notatek
  └─ UNIQUE(userId, exerciseId)
```

## Kluczowe reguły biznesowe

### 1. Jeden aktywny trening

`createWorkout` sprawdza czy użytkownik ma aktywny trening o statusie `DRAFT`. Jeśli tak — zwraca istniejący zamiast tworzyć nowy. Gwarantuje to, że nigdy nie ma dwóch równoległych aktywnych treningów.

### 2. Pełne przebudowanie statystyk (`rebuildExerciseStatsFromCompletedWorkouts`)

Statystyki (`ExerciseUserStats`) są **zawsze przebudowywane od zera** — nigdy nie aktualizowane inkrementalnie. Wyzwalacze:

- Ukończenie treningu (`status → COMPLETED`)
- Usunięcie treningu
- Edycja serii w ukończonym treningu (zmiana ciężaru/powtórzeń)
- Dodanie/usunięcie ćwiczenia z ukończonego treningu

Algorytm (`workout.service.ts → rebuildExerciseStatsFromCompletedWorkouts`):
1. Pobiera wszystkie punkty progresji z `getExerciseProgression` (tylko COMPLETED workouty)
2. Jeśli brak punktów → usuwa rekord stats
3. Oblicza: `lastPoint` (ostatni trening), `maxPoint` (najwyższy ciężar w serii)
4. Pobiera ostatnią notatkę z `getLastWorkoutNote`
5. Upsertuje `ExerciseUserStats`

### 3. Mechanizm carry-over notatek

Notatki są przenoszone między treningami przez dwustopniowy mechanizm:

**Etap 1 — zapis notatki (podczas treningu):**
- `PATCH /api/workouts/items/:itemId` z `{ notes: "..." }`
- Service wywołuje `syncPendingNoteForExercise` → upsertuje `ExercisePendingNote`
- Jeśli notatka jest pusta (`null` / whitespace) → czyści `ExercisePendingNote`
- To samo przy ukończeniu treningu — dla każdej pozycji

**Etap 2 — konsumpcja notatki (przy dodawaniu ćwiczenia):**
- `POST /api/workouts/:workoutId/exercises`
- `addExerciseToWorkoutWithPendingNote` (transakcja Prisma):
  1. Wyszukuje `ExercisePendingNote` dla `(userId, exerciseId)`
  2. Tworzy `WorkoutItem` z `previousNote = pendingNote?.note ?? null`
  3. Usuwa `ExercisePendingNote` (jednorazowe zużycie)
- Następnie tworzy pierwszy set z domyślnymi wartościami z `ExerciseUserStats`

### 4. Domyślne wartości pierwszego setu

Gdy użytkownik dodaje ćwiczenie do treningu, pierwszy set jest tworzony automatycznie z wartościami:
- `weight` = `ExerciseUserStats.lastWeight` (ostatni użyty ciężar) lub `0`
- `repetitions` = `ExerciseUserStats.lastReps` lub `1`

Dzięki temu użytkownik widzi od razu sugestię na podstawie poprzedniego treningu.

## Endpointy API

Pełny router: `backend/src/modules/workout/workout.routes.ts`

```
POST   /api/workouts                        – stwórz trening
GET    /api/workouts                        – lista treningów użytkownika
GET    /api/workouts/active                 – ID aktywnego treningu
DELETE /api/workouts/active                 – wyczyść aktywny trening
GET    /api/workouts/:id                    – szczegóły treningu
PATCH  /api/workouts/:id                    – aktualizuj trening (w tym status)
DELETE /api/workouts/:id                    – usuń trening

POST   /api/workouts/:workoutId/exercises   – dodaj ćwiczenie do treningu
PATCH  /api/workouts/items/:itemId          – aktualizuj pozycję (notatki)
DELETE /api/workouts/items/:itemId          – usuń ćwiczenie z treningu

POST   /api/workouts/items/:itemId/sets     – dodaj serię
PATCH  /api/workouts/sets/:setId            – aktualizuj serię
DELETE /api/workouts/sets/:setId            – usuń serię

GET    /api/workouts/stats/all              – statystyki wszystkich ćwiczeń
GET    /api/workouts/stats/overview         – przegląd (treningi / miesiąc, wolumen)
GET    /api/workouts/stats/progression/:id  – progresja ćwiczenia (punkty na wykres)
GET    /api/workouts/stats/exercise/:id     – statystyki konkretnego ćwiczenia
```

## Standardowy format odpowiedzi

```json
{ "status": "success", "data": { ... } }
{ "status": "error",   "message": "..." }
```

## Baza danych

Singleton Prisma client w `config/database.ts`. Połączenie jest nawiązywane przy pierwszym użyciu i reużywane przez cały czas życia procesu.

Migracje: `prisma migrate dev` (lokalne), `prisma migrate deploy` (produkcja — Railway).

## Testy

Framework: **Vitest**. Warstwa repository jest mockowana w testach serwisu przez `vi.mock('./workout.repository.js')`.

```bash
cd backend && npm test
```

Testy zlokalizowane w `*.service.test.ts` i `*.repository.test.ts`.
