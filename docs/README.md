# GymGate – Dokumentacja projektu

> Punkt wejścia dla programistów i agentów AI pracujących z tym repozytorium.  
> Projekt: fullstack strength-training tracker. Backend: Node.js + Express + Prisma + PostgreSQL. Frontend: React 19 + Vite + Tailwind CSS.

---

## Szybki start

```bash
# Backend (port 3000) – uruchamiany przez Docker
cd backend && cp .env.example .env  # uzupełnij DATABASE_URL, DIRECT_URL, JWT_SECRET, API_PORT
make up    # build + start kontenera; migracje wykonywane automatycznie
make logs  # opcjonalnie – podgląd logów

# Frontend (port 5173)
cd frontend && cp .env.example .env
npm install && npm run dev
```

Pełny onboarding → [`ONBOARDING.md`](./ONBOARDING.md)

---

## Mapa dokumentacji

```
docs/
├── README.md              ← jesteś tutaj – punkt wejścia
├── ARCHITECTURE.md        ← diagram systemu, stos tech, modele danych, deployment
├── ONBOARDING.md          ← środowisko dev, struktura kodu, konwencje
│
├── modules/
│   ├── auth.md            ← rejestracja, logowanie, JWT, AuthContext
│   ├── workout.md         ← treningi, serie, statystyki, PendingNote flow
│   ├── exercise.md        ← CRUD ćwiczeń, MuscleGroup enum
│   ├── database.md        ← schemat DB, tabele, Prisma, migracje
│   └── offline-sync.md   ← IndexedDB, SyncManager, optimistic updates, temp IDs
│
├── adr/
│   ├── 001-postgresql.md          ← dlaczego PostgreSQL
│   ├── 002-jwt-bearer.md          ← JWT Bearer vs cookie
│   ├── 003-offline-indexeddb.md   ← offline-first z IndexedDB
│   ├── 004-context-api-state.md   ← Context API zamiast Zustand/Redux
│   └── 005-stats-rebuild.md       ← pełny rebuild stats vs inkrementalny
│
└── api/
    └── openapi.yaml       ← kompletna spec REST API (OpenAPI 3.1)
```

---

## Kluczowe konwencje (TL;DR dla agentów)

| Zasada                | Szczegóły                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Backend layering**  | `routes → controller → service → repository` – warstwy nie są pomijane                                        |
| **Walidacja**         | Zod schema w `*.schema.ts`; middleware `validate(schema)` zwraca 422                                          |
| **Auth**              | `authMiddleware` dołącza `req.userId` i `req.userEmail` do każdego chronionego requestu                       |
| **Optimistic update** | UI + IndexedDB aktualizowane przed odpowiedzią serwera; rollback na błąd serwera                              |
| **Stats**             | `ExerciseUserStats` jest zawsze **przebudowywany w całości** – aktualizacja inkrementalna nie jest stosowana  |
| **Temp IDs**          | Offline encje mają prefix `temp_*`; SyncManager zastępuje je prawdziwymi UUID po sync                         |
| **API docs**          | Po zmianie kontraktu należy zaktualizować `backend/src/modules/<module>/API.md` **i** `docs/api/openapi.yaml` |
| **Response format**   | Sukces: `{ success: true, data: ... }` / Błąd: `{ success: false, error: "..." }`                             |
| **Plany wykonania**   | Konwencja nazewnictwa i lokalizacji: [`PLANS.md`](./PLANS.md)                                                    |

---

## Powiązane zasoby

| Zasób                                | Lokalizacja                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Backend – uruchomienie (3 opcje)     | [`backend/docs/running-locally.md`](../backend/docs/running-locally.md)                 |
| Backend – architektura (szczegółowa) | [`backend/docs/ARCHITECTURE.md`](../backend/docs/ARCHITECTURE.md)                       |
| Moduł auth – API kontrakt            | [`backend/src/modules/auth/auth.routes.ts`](../backend/src/modules/auth/auth.routes.ts) |
| Moduł exercise – API kontrakt        | [`backend/src/modules/exercise/API.md`](../backend/src/modules/exercise/API.md)         |
| Moduł workout – API kontrakt         | [`backend/src/modules/workout/API.md`](../backend/src/modules/workout/API.md)           |
| Prisma schema                        | [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)                       |
| Postman collection                   | [`backend/postman/`](../backend/postman/)                                               |
| Frontend offline docs                | [`frontend/docs/OFFLINE.md`](../frontend/docs/OFFLINE.md)                               |
| Wymagania funkcjonalne               | [`other/functional-requirements.md`](../other/functional-requirements.md)               |
| Plany realizacji                     | [`docs/PLANS.md`](./PLANS.md), pliki fizycznie w [`plans/`](../plans/)                   |
