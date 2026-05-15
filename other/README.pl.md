<p align="center">
  <img src="logo/gym_gate_logo.png" alt="GymGate Logo" width="110" />
</p>

<h1 align="center">GymGate</h1>
<p align="center">PLATFORMA DO SLEDZENIA TRENINGOW SILOWYCH</p>

<p align="center">
  <a href="../README.md">English</a> &nbsp;|&nbsp; <a href="README.pl.md"><strong>Polski</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## O projekcie

GymGate to fullstackowa aplikacja webowa dla osob trenujacych silowo. Pozwala szybko rozpoczac sesje, budowac treningi przez dodawanie cwiczen i serii, a nastepnie zamknac sesje z automatyczna aktualizacja statystyk.

Aplikacja opiera sie na architekturze offline-first — wszystkie dane sa utrwalane lokalnie w przegladarce i synchronizowane z backendem w tle. Kazda akcja uzytkownika natychmiast aktualizuje interfejs, bez oczekiwania na odpowiedz serwera.

---

## Zrzuty ekranu

<p align="center">
  <img src="app_photos/gymgate.PNG" alt="Lista treningow" width="230" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="app_photos/gymgate2.png" alt="Aktywny trening" width="230" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="app_photos/gymgate7.png" alt="Statystyki cwiczen" width="230" />
</p>

## Funkcje

- **Szybki start** — rozpoczecie sesji w statusie `DRAFT` jednym kliknieciem.
- **Budowanie treningu** — dodawanie cwiczen, kolejnosci i notatek.
- **Zarzadzanie seriami** — waga, powtorzenia, edycja i usuwanie.
- **Zamkniecie sesji** — przejscie do `COMPLETED` z przebudowa statystyk.
- **Statystyki cwiczen** — maksymalny ciezar, ostatnie wykonanie, liczba treningow.
- **Offline-first UX** — optymistyczne aktualizacje UI z kopią w IndexedDB, synchronizacja po powrocie online.
- **Bezpieczne uwierzytelnianie** — zarzadzanie sesja przez JWT w httpOnly cookie.

---

## Architektura techniczna

### Offline-first

Kazda mutacja stanu przebiega wedlug tego samego schematu: UI oraz lokalny IndexedDB sa aktualizowane natychmiast (optimistic update), a wywolanie API nastepuje w tle. Jesli serwer zwroci blad, stan jest cofany do poprzedniej wartosci.

Gdy uzytkownik jest offline, operacje zapisu trafiaja do kolejki w IndexedDB zamiast byc odrzucane. `syncManager` pracuje cyklicznie i oproznial kolejke natychmiast po przywroceniu polaczenia, odtwarzajac operacje w oryginalnej kolejnosci.

Nowe rekordy otrzymuja tymczasowe ID po stronie klienta (`temp_*`). Po potwierdzeniu przez API ID sa przemapowywane w calym lokalnym stanie — nie powstaja zadne nieaktualne referencje.

### Silnik statystyk

`ExerciseUserStats` przechowuje metryki per cwiczenie: `maxWeight`, `lastWeight`, `lastReps` i `totalWorkouts`. Zamiast aktualizowac je przyrostowo, system wykonuje **pelna przebudowe** przez agregacje wszystkich treningow w statusie `COMPLETED` — po kazdym zamknieciu sesji, usunieciu treningu lub edycji serii wewnatrz zakonczonych treningow.

Takie podejscie gwarantuje spojnosc danych: nie ma ryzyka, ze statystyki sie rozjada przez czesciowe aktualizacje lub nieudane transakcje.

### Przenoszenie notatek

Gdy uzytkownik doda notatke do cwiczenia podczas sesji, jest ona upsertowana do tabeli `ExercisePendingNote`. Gdy to cwiczenie zostanie dodane do kolejnego treningu, oczekujaca notatka jest pobierana w transakcji, zapisywana do `WorkoutItem.previousNote` i natychmiast usuwana — skonsumowana dokladnie raz.

### Uwierzytelnianie

JWT jest przechowywany w httpOnly cookie — niedostepnym dla JavaScriptu, co chroni przed atakami XSS. Kazda chroniona trasa API jest strzezone przez middleware walidujace token przed przekazaniem zadania do kontrolera.

---

## Moduly systemu

### Uwierzytelnianie

- Rejestracja i logowanie uzytkownika
- Utrzymanie sesji przez JWT w httpOnly cookie
- `GET /api/auth/me` do odtwarzania sesji po odswiezeniu strony

### Zarzadzanie treningami

- Tworzenie, edycja i usuwanie sesji treningowych
- Sledzenie aktywnego treningu (tylko jedna sesja `DRAFT` naraz)
- Zamkniecie sesji: przejscie do `COMPLETED` i wyzwolenie przebudowy statystyk

### Biblioteka cwiczen

- Pelny CRUD cwiczen (globalna baza + cwiczenia uzytkownika)
- Kategoryzacja wedlug grup miesniowych i opisy

### Statystyki

- Statystyki per cwiczenie: `maxWeight`, `lastWeight`, `lastReps`, `totalWorkouts`
- Przebudowa od zera po kazdym zakonczeniu, usunieciu lub edycji serii
- Agregacja wylacznie z treningow w statusie `COMPLETED`

### Synchronizacja offline

- Wszystkie dane utrwalone lokalnie przez IndexedDB (`localStore`)
- Optymistyczne aktualizacje UI z automatycznym rollbackiem przy bledzie
- Kolejka zapisu odtwarzana przez `syncManager` po powrocie online

---

## Stos technologiczny

### Backend

| Technologia | Zastosowanie |
|---|---|
| Node.js + Express (TypeScript) | Warstwa API |
| Prisma ORM | Modelowanie i dostep do danych |
| PostgreSQL | Relacyjna baza danych |
| Zod | Walidacja danych wejsciowych |
| bcryptjs | Hashowanie hasel |

### Frontend

| Technologia | Zastosowanie |
|---|---|
| React 19 + Vite + TypeScript | Framework UI |
| Tailwind CSS | Stylowanie |
| Context API | Globalny stan aplikacji |
| IndexedDB (localStore) | Lokalny cache i trwalosc offline |

---

## Architektura

### Backend (`backend/`)

Modularny podzial z rygorystycznym warstwowaniem w kazdym module:

```
routes -> controller -> service -> repository
```

Moduly: `auth`, `user`, `exercise`, `workout`. Punkt startowy: `src/index.ts`. Model domenowy w `prisma/schema.prisma`.

### Frontend (`frontend/`)

- `AuthContext` — sesja i tozsamosc uzytkownika
- `DataContext` — dane domenowe i akcje biznesowe (jedyny globalny store)
- `syncManager` — cykliczny sync i obsluga online/offline
- Komponenty ekranow dla treningow, cwiczen i statystyk

---

## Przeglad API

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/exercises
POST   /api/exercises
PATCH  /api/exercises/:id
DELETE /api/exercises/:id

GET    /api/workouts
POST   /api/workouts
PATCH  /api/workouts/:id
DELETE /api/workouts/:id

POST   /api/workouts/:workoutId/exercises
POST   /api/workouts/items/:itemId/sets

GET    /api/workouts/stats/all
GET    /api/workouts/stats/exercise/:exerciseId
```

Pelna dokumentacja endpointow:

- [`backend/src/modules/user/API.md`](../backend/src/modules/user/API.md)
- [`backend/src/modules/exercise/API.md`](../backend/src/modules/exercise/API.md)
- [`backend/src/modules/workout/API.md`](../backend/src/modules/workout/API.md)

---

## Autor

**Mateusz Ciolkowski**
