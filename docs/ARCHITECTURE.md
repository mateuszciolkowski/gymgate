# GymGate – Architektura systemu

## Diagram systemu

```
┌─────────────────────────────────────────────────────────┐
│                      PRZEGLĄDARKA                        │
│                                                          │
│  React 19 SPA (Vite)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  AuthContext │  │  DataContext │  │  IndexedDB   │  │
│  │  (sesja JWT) │  │  (global     │  │  (localStore)│  │
│  └──────────────┘  │   store)     │  └──────────────┘  │
│                    └──────┬───────┘         ▲           │
│                           │ authFetch        │           │
│                     SyncManager ────────────┘           │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTPS / REST JSON
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     BACKEND (Railway)                    │
│                                                          │
│  Express 5 + TypeScript                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  authMiddleware (JWT)  →  validate (Zod)          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  /api/auth     /api/exercises     /api/workouts          │
│       │               │                │                 │
│   auth module   exercise module   workout module         │
│  routes → controller → service → repository             │
│                           │                              │
│                        Prisma ORM                        │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
                   PostgreSQL (Supabase)
```

## Stos technologiczny

### Backend

| Warstwa        | Technologia             | Wersja |
| -------------- | ----------------------- | ------ |
| Runtime        | Node.js                 | 20 LTS |
| Framework      | Express                 | 5.x    |
| Język          | TypeScript              | 5.9    |
| ORM            | Prisma                  | 5.22   |
| Baza danych    | PostgreSQL (Supabase)   | 16     |
| Auth           | JWT (`jsonwebtoken`)    | 9.x    |
| Hashing        | bcryptjs                | 3.x    |
| Walidacja      | Zod                     | 4.x    |
| Testy          | Vitest + Supertest      | 4.x    |
| Konteneryzacja | Docker / docker-compose | -      |
| Deploy         | Railway (Nixpacks)      | -      |

### Frontend

| Warstwa         | Technologia                 | Wersja |
| --------------- | --------------------------- | ------ |
| Framework       | React                       | 19     |
| Bundler         | Vite                        | 7.x    |
| Język           | TypeScript                  | 5.9    |
| Styling         | Tailwind CSS                | 4.x    |
| State           | Context API (bez bibliotek) | -      |
| Offline storage | IndexedDB (`localStore`)    | -      |
| Testy E2E       | Playwright                  | 1.x    |
| Deploy          | Vercel                      | -      |

## Architektura backendu

### Podział modułów

```
backend/src/
├── modules/
│   ├── auth/        – rejestracja, login, GET /me
│   ├── user/        – profil użytkownika
│   ├── exercise/    – CRUD ćwiczeń (globalne + user-created)
│   └── workout/     – treningi, pozycje, serie, statystyki
├── common/
│   └── middleware/
│       ├── auth.ts      – JWT guard (authMiddleware)
│       └── validate.ts  – Zod guard (validate(schema))
├── config/
│   └── database.ts  – singleton Prisma client
└── index.ts         – punkt wejściowy Express
```

### Warstwa modułu (strict layering)

```
routes → controller → service → repository
```

| Warstwa      | Odpowiedzialność                                           |
| ------------ | ---------------------------------------------------------- |
| `routes`     | Router Express, aplikuje middleware auth + validate        |
| `controller` | Mapuje HTTP req/res, deleguje do service, zwraca odpowiedź |
| `service`    | Logika biznesowa (rebuild stats, pending note sync, itd.)  |
| `repository` | Wyłącznie zapytania Prisma, zero logiki biznesowej         |

### Middleware pipeline

```
Każde żądanie chronione:
  authMiddleware  →  validate(schema)  →  controller
```

- `authMiddleware` – weryfikuje `Authorization: Bearer <token>`, dołącza `req.userId` i `req.userEmail`
- `validate(schema)` – waliduje `req.body` / `req.query` przez Zod; zwraca `422` gdy dane nie przechodzą

## Architektura frontendu

### State management

Jedynym globalnym stanem jest `DataContext`. Żadna zewnętrzna biblioteka stanu nie jest stosowana (Redux, Zustand, itp.).

```
AuthContext   – sesja JWT + dane user (localStorage)
DataContext   – workouts[], exercises[], stats[], activeWorkoutId
                → optimistic updates + IndexedDB + API calls
SyncManager   – background sync co 2 min + flush po powrocie online
localStore    – wrapper IndexedDB (stores: workouts, exercises, stats, pendingSync, metadata)
```

### Wzorzec aktualizacji (optimistic update)

```
1. Aktualizuj UI natychmiast (setState + localStore)
2. Wyślij request do API w tle
3. Na błąd sieciowy → dodaj do pendingSync w IndexedDB
4. Na błąd serwera → rollback
5. SyncManager odtwarza pendingSync przy powrocie online (max 3 retry)
```

### Router (SPA bez biblioteki)

Nawigacja opiera się na własnym hooku `useNavigation` i `useState<Screen>` – bez React Router. Ekrany: `trainings`, `workout-detail`, `exercises`, `add-exercise`, `edit-exercise`, `stats`, `stats-exercise-detail`, `menu`.

## Schemat bazy danych

```
User (users)
  id, email, password, firstName, lastName, phone?, activeWorkoutId?

Exercise (exercises)
  id, name, muscleGroups[], description?, creatorUserId?
  → photos: ExercisePhoto[]

Workout (workouts)
  id, userId, workoutDate, status(DRAFT|COMPLETED), workoutName?,
  gymName?, location?, workoutNotes?, durationSeconds?
  → items: WorkoutItem[]

WorkoutItem (workout_items)
  id, workoutId, exerciseId, orderInWorkout, notes?, previousNote?
  → sets: WorkoutSet[]

WorkoutSet (workout_sets)
  id, itemId, setNumber, weight(Decimal 6,2), repetitions

ExerciseUserStats (exercise_user_stats)
  id, userId, exerciseId, maxWeight, maxWeightReps, maxWeightDate,
  lastWeight, lastReps, lastWorkoutDate, totalWorkouts, lastNote?
  → UNIQUE(userId, exerciseId)

ExercisePendingNote (exercise_pending_notes)
  id, userId, exerciseId, note
  → UNIQUE(userId, exerciseId)  ← tabela przejściowa dla carry-over notatek
```

## Deployment

| Środowisko | Backend                | Frontend      | Baza danych          |
| ---------- | ---------------------- | ------------- | -------------------- |
| Produkcja  | Railway (Nixpacks)     | Vercel        | Supabase PG 16       |
| Lokalnie   | `npm run dev` / Docker | `npm run dev` | Docker PG / Supabase |

### CORS

`ALLOWED_ORIGINS` (env var, CSV) – domyślnie `http://localhost:5173` + `https://gymgate.vercel.app`.

## Architecture Decision Records

Szczegółowe uzasadnienia decyzji projektowych: [`docs/adr/`](./adr/)

- [ADR-001 – PostgreSQL jako baza danych](./adr/001-postgresql.md)
- [ADR-002 – JWT Bearer zamiast sesji cookie](./adr/002-jwt-bearer.md)
- [ADR-003 – Offline-first z IndexedDB](./adr/003-offline-indexeddb.md)
- [ADR-004 – Context API zamiast zewnętrznego state managera](./adr/004-context-api-state.md)
- [ADR-005 – Rebuild stats zamiast aktualizacji inkrementalnej](./adr/005-stats-rebuild.md)
