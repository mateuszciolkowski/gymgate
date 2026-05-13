# GymGate – Onboarding dla programistów

## Wymagania wstępne

| Narzędzie | Minimalna wersja |
| --------- | ---------------- |
| Docker    | 24+              |
| Git       | dowolna          |

> Node.js i npm są wymagane jedynie do uruchomienia frontendu (`npm run dev`). Backend uruchamiany jest wyłącznie przez Docker.

---

## 1. Klonowanie repozytorium

```bash
git clone https://github.com/<owner>/gymgate.git
cd gymgate
```

---

## 2. Backend

### 2a. Zmienne środowiskowe

```bash
cd backend
cp .env.example .env
```

Należy uzupełnić `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/gymgate"
DIRECT_URL="postgresql://user:password@host:5432/gymgate"
JWT_SECRET="min-32-znakowy-losowy-sekret"
NODE_ENV=development
API_PORT=3000
# PORT – ustawiany automatycznie przez Railway w produkcji; lokalnie używany jest API_PORT
```

> `DATABASE_URL` i `DIRECT_URL` mogą być identyczne przy bezpośrednim połączeniu z PostgreSQL.  
> Różnią się, gdy `DATABASE_URL` przechodzi przez connection pooler (PgBouncer / Prisma Accelerate).

### 2b. Uruchomienie przez Docker

Backend (API + baza danych) uruchamiany jest wyłącznie przez Docker Compose przy użyciu `make`:

```bash
make up     # build obrazu + uruchomienie kontenera (detached)
make logs   # śledzenie logów kontenera
make down   # zatrzymanie i usunięcie kontenera
```

Kontener po uruchomieniu automatycznie wykonuje `prisma migrate deploy` oraz `npm run build && npm run start`.  
Port API ustawiany jest przez `API_PORT` w `.env` (domyślnie `3000`).

Weryfikacja:

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 2c. Operacje na bazie (wewnątrz kontenera)

```bash
make docker-migrate   # prisma migrate deploy wewnątrz kontenera
make docker-seed      # seed bazy wewnątrz kontenera
```

---

## 3. Frontend

```bash
cd ../frontend
cp .env.example .env
```

`.env` – frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=GymGate
VITE_DEBUG=true
```

```bash
npm install
npm run dev        # Vite dev server na porcie 5173
```

Otwórz: [http://localhost:5173](http://localhost:5173)

---

## 4. Szybka weryfikacja stosu

```bash
# Backend
cd backend
npm run typecheck  # tsc --noEmit
npm test           # Vitest

# Frontend
cd frontend
npm run typecheck  # tsc -b
npm run lint       # eslint
```

---

## 5. Makefile – dostępne komendy

```bash
# Cykl życia kontenera
make up             # build obrazu + uruchomienie (detached)
make down           # zatrzymanie i usunięcie kontenera
make build          # rebuild obrazu bez uruchamiania
make logs           # śledzenie logów
make restart        # restart kontenera

# Baza danych (wewnątrz kontenera)
make docker-migrate # prisma migrate deploy
make docker-seed    # seed bazy

# Pomoc
make help           # lista wszystkich targetów z opisami
```

---

## 6. Struktura kodu – gdzie co szukać

### Backend (`backend/src/`)

```
modules/
  auth/
    auth.routes.ts      ← endpoints: POST /register, POST /login, GET /me
    auth.controller.ts
    auth.service.ts     ← logika: bcrypt, JWT sign/verify
    auth.schema.ts      ← Zod schemas
  exercise/
    exercise.routes.ts  ← GET/POST/PATCH/DELETE /api/exercises
    ...
    API.md              ← kontrakt endpointów modułu
  workout/
    workout.routes.ts   ← workouts, items, sets, stats
    ...
    API.md
  user/
    user.routes.ts      ← GET /api/users/:id
    API.md
common/middleware/
  auth.ts              ← JWT guard → req.userId, req.userEmail
  validate.ts          ← Zod guard → 422 na błąd walidacji
config/
  database.ts          ← singleton Prisma client
index.ts               ← Express app, CORS, routing, graceful shutdown
```

### Frontend (`frontend/src/`)

```
contexts/
  AuthContext.tsx      ← login, register, logout, token w localStorage
  DataContext.tsx      ← jedyny globalny store; optimistic updates
hooks/
  useWorkout.ts        ← hook dla WorkoutDetailScreen
  useWorkouts.ts       ← hook dla listy treningów
  useExercises.ts      ← hook dla listy ćwiczeń
  useNavigation.ts     ← własny router SPA (useState<Screen>)
  useTheme.ts          ← dark/light mode
utils/
  localStore.ts        ← wrapper IndexedDB (6 stores)
  syncManager.ts       ← background sync, pendingSync queue, retry
  auth.ts              ← authFetch (auto 401 handling) + getAuthHeaders
components/screens/    ← wszystkie ekrany aplikacji
types/
  workout.ts           ← typy domenowe (Workout, WorkoutItem, WorkoutSet, ...)
```

---

## 7. Konwencje i zasady

- **Każdy moduł backendu** ma `API.md` w swoim katalogu – plik należy aktualizować przy każdej zmianie kontraktu.
- **Optimistic update** – każda mutacja w `DataContext` najpierw aktualizuje UI i IndexedDB, następnie wysyła request do API.
- **Stats rebuild** – `ExerciseUserStats` jest zawsze **przebudowywany od zera** (nie inkrementalnie) po zakończeniu treningu, usunięciu lub edycji serii w zakończonym treningu.
- **PendingNote flow** – notatka przenoszona jest między treningami przez tabelę `ExercisePendingNote` (upsert przy zapisie, delete przy dodaniu ćwiczenia do treningu).
- **BigInt serialization** – `BigInt.prototype.toJSON` patchowany jest globalnie w `index.ts`.
- **Środowiska prod** – Railway (backend) + Vercel (frontend); wdrożenie następuje przez push na `main`.

---

## 8. Linki

| Zasób                  | Ścieżka / URL                                                           |
| ---------------------- | ----------------------------------------------------------------------- |
| Architektura systemu   | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)                             |
| Moduł auth             | [`docs/modules/auth.md`](./modules/auth.md)                             |
| Moduł workout          | [`docs/modules/workout.md`](./modules/workout.md)                       |
| Moduł exercise         | [`docs/modules/exercise.md`](./modules/exercise.md)                     |
| Moduł offline/sync     | [`docs/modules/offline-sync.md`](./modules/offline-sync.md)             |
| OpenAPI spec           | [`docs/api/openapi.yaml`](./api/openapi.yaml)                           |
| ADR                    | [`docs/adr/`](./adr/)                                                   |
| Backend – uruchomienie | [`backend/docs/running-locally.md`](../backend/docs/running-locally.md) |
| Backend – architektura | [`backend/docs/ARCHITECTURE.md`](../backend/docs/ARCHITECTURE.md)       |
| Postman collection     | [`backend/postman/`](../backend/postman/)                               |
