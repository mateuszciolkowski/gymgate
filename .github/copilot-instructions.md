# Copilot Instructions for GymGate

Ten dokument pomaga Copilotowi szybciej i trafniej pracować w tym repozytorium.

## 1) Cel projektu

GymGate to aplikacja do prowadzenia treningów siłowych:

- frontend: React + TypeScript + Vite,
- backend: Express + TypeScript + Prisma,
- auth: JWT,
- dane: PostgreSQL,
- UX: offline-first + synchronizacja w tle.

## 2) Priorytety podczas zmian

1. Nie psuj flow treningu: create workout -> add exercises -> add sets -> complete workout.
2. Zachowuj kompatybilność API frontend <-> backend.
3. Szanuj podejście offline-first (lokalne dane + sync).
4. Zmieniaj kod chirurgicznie, bez refaktorów „przy okazji”.

## 3) Mapa kodu (szybki onboarding)

### Backend

- `backend/src/index.ts` – uruchomienie API, CORS, routery.
- `backend/src/modules/auth/*` – logowanie/rejestracja/token.
- `backend/src/modules/user/*` – użytkownicy.
- `backend/src/modules/exercise/*` – CRUD ćwiczeń.
- `backend/src/modules/workout/*` – treningi, serie, statystyki.
- `backend/prisma/schema.prisma` – model domeny.

### Frontend

- `frontend/src/contexts/AuthContext.tsx` – sesja użytkownika.
- `frontend/src/contexts/DataContext.tsx` – globalny stan i operacje danych.
- `frontend/src/utils/localStore.ts` – cache lokalny.
- `frontend/src/utils/syncManager.ts` – synchronizacja online/offline.
- `frontend/src/components/screens/*` – główne ekrany.

## 4) Zasady implementacyjne

- Używaj TypeScript bez `any` (chyba że to absolutnie konieczne i lokalnie ograniczone).
- Zachowuj istniejący styl nazw i strukturę modułów.
- Walidację requestów trzymaj w schematach (`*.schema.ts`), nie w kontrolerach.
- Logikę biznesową trzymaj w `service`, nie w `controller`.
- Przy zmianie modelu danych aktualizuj Prisma + miejsca użycia.

## 5) API i kontrakty

Przed zmianą endpointów sprawdź:

- `backend/src/modules/user/API.md`
- `backend/src/modules/exercise/API.md`
- `backend/src/modules/workout/API.md`

Jeśli zmieniasz request/response, zaktualizuj te pliki i frontendowe typy.

## 6) Workflow jakości

Po zmianach uruchamiaj tylko istniejące skrypty projektu:

### Backend

```bash
cd backend
npm run build
```

### Frontend

```bash
cd frontend
npm run build
```

Jeśli dotykasz logiki backendu, uruchom także testy jeśli są dostępne dla zmienianego modułu.

## 7) Bezpieczeństwo i sekrety

- Nigdy nie commituj prawdziwych sekretów do repo.
- Korzystaj z `.env.example` jako szablonu, a nie źródła danych produkcyjnych.
- Nie loguj tokenów, haseł ani pełnych danych uwierzytelniających.

## 8) Preferowany styl odpowiedzi Copilota

- Najpierw krótko: *co zmieniono i dlaczego*.
- Potem lista plików i wpływ na zachowanie.
- Na końcu: jak zweryfikować (konkretne komendy).

## 9) Gotowe prompty dla szybszej współpracy

### Analiza błędu

`Przeanalizuj błąd w [plik/moduł], wskaż przyczynę źródłową i zaproponuj minimalny patch bez naruszania kontraktów API.`

### Dodanie funkcji

`Dodaj funkcję [nazwa] w module [x], zachowując strukturę controller/service/repository oraz aktualizując typy frontendu i dokumentację API.`

### Bezpieczny refaktor

`Zrefaktoruj [fragment] bez zmiany zachowania. Pokaż, które testy/build potwierdzają brak regresji.`

