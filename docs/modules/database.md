# Moduł: Baza danych

## Technologia

PostgreSQL 16 zarządzany przez **Prisma ORM** (`prisma@5.22`). W produkcji: Supabase. Lokalnie: Docker (`postgres:16-alpine`) lub dowolna instancja PostgreSQL.

## Konfiguracja połączenia

```env
DATABASE_URL="postgresql://..."   # przez pooler (Prisma Accelerate / PgBouncer) lub bezpośrednie
DIRECT_URL="postgresql://..."     # bezpośrednie połączenie, używane przy migracjach
```

Singleton Prisma client: `backend/src/config/database.ts`

## Schemat – tabele i relacje

### `users`

| Kolumna          | Typ          | Opis                            |
|------------------|--------------|---------------------------------|
| `id`             | UUID PK      |                                 |
| `email`          | STRING UNIQUE|                                 |
| `password`       | STRING       | hash bcrypt                     |
| `firstName`      | STRING       |                                 |
| `lastName`       | STRING       |                                 |
| `phone`          | STRING?      |                                 |
| `activeWorkoutId`| UUID? UNIQUE | FK → workouts (nullable, SetNull) |
| `updatedAt`      | DATETIME     |                                 |

### `exercises`

| Kolumna        | Typ          | Opis                               |
|----------------|--------------|------------------------------------|
| `id`           | UUID PK      |                                    |
| `name`         | STRING       |                                    |
| `muscleGroups` | MuscleGroup[]| enum array                         |
| `description`  | STRING?      |                                    |
| `creatorUserId`| UUID?        | FK → users (Cascade); null = globalne |
| `createdAt`    | DATETIME     |                                    |
| `updatedAt`    | DATETIME     |                                    |

### `exercise_photos`

| Kolumna      | Typ        | Opis                        |
|--------------|------------|-----------------------------|
| `id`         | UUID PK    |                             |
| `exerciseId` | UUID       | FK → exercises (Cascade)    |
| `photoStage` | PhotoStage | START \| MIDDLE \| END      |
| `photoUrl`   | STRING     | URL lub ścieżka lokalna     |
| `createdAt`  | DATETIME   |                             |

### `workouts`

| Kolumna          | Typ           | Opis                       |
|------------------|---------------|----------------------------|
| `id`             | UUID PK       |                            |
| `userId`         | UUID          | FK → users (Cascade)       |
| `workoutDate`    | DATETIME      | domyślnie: now()           |
| `status`         | WorkoutStatus | DRAFT \| COMPLETED         |
| `workoutName`    | STRING?       |                            |
| `gymName`        | STRING?       |                            |
| `location`       | STRING?       |                            |
| `workoutNotes`   | STRING?       |                            |
| `durationSeconds`| INT?          |                            |
| `createdAt`      | DATETIME      |                            |
| `updatedAt`      | DATETIME      |                            |

### `workout_items`

| Kolumna         | Typ      | Opis                              |
|-----------------|----------|-----------------------------------|
| `id`            | UUID PK  |                                   |
| `workoutId`     | UUID     | FK → workouts (Cascade)           |
| `exerciseId`    | UUID     | FK → exercises (Cascade)          |
| `orderInWorkout`| INT      | kolejność ćwiczenia w treningu    |
| `notes`         | STRING?  | notatka do bieżącego treningu     |
| `previousNote`  | STRING?  | carry-over z poprzedniego treningu|
| `createdAt`     | DATETIME |                                   |
| `updatedAt`     | DATETIME |                                   |

### `workout_sets`

| Kolumna      | Typ            | Opis                  |
|--------------|----------------|-----------------------|
| `id`         | UUID PK        |                       |
| `itemId`     | UUID           | FK → workout_items (Cascade) |
| `setNumber`  | INT            | numer serii           |
| `weight`     | Decimal(6,2)   | ciężar w kg           |
| `repetitions`| INT            | liczba powtórzeń      |
| `createdAt`  | DATETIME       |                       |
| `updatedAt`  | DATETIME       |                       |

### `exercise_user_stats`

Cache statystyk, odbudowywany przy każdej zmianie zakończonych treningów.

| Kolumna          | Typ          | Opis                              |
|------------------|--------------|-----------------------------------|
| `id`             | UUID PK      |                                   |
| `userId`         | UUID         | FK → users (Cascade)              |
| `exerciseId`     | UUID         | FK → exercises (Cascade)          |
| `maxWeight`      | Decimal(6,2) | najwyższy kiedykolwiek ciężar     |
| `maxWeightReps`  | INT          | powtórzenia przy maxWeight        |
| `maxWeightDate`  | DATETIME     |                                   |
| `lastWeight`     | Decimal(6,2) | ciężar z ostatniego COMPLETED     |
| `lastReps`       | INT          |                                   |
| `lastWorkoutDate`| DATETIME     |                                   |
| `totalWorkouts`  | INT          | liczba COMPLETED z tym ćwiczeniem |
| `lastNote`       | STRING?      |                                   |
| `createdAt`      | DATETIME     |                                   |
| `updatedAt`      | DATETIME     |                                   |

**UNIQUE:** `(userId, exerciseId)`

### `exercise_pending_notes`

Tabela przejściowa dla mechanizmu carry-over notatek.

| Kolumna      | Typ      | Opis                           |
|--------------|----------|-------------------------------|
| `id`         | UUID PK  |                               |
| `userId`     | UUID     | FK → users (Cascade)          |
| `exerciseId` | UUID     | FK → exercises (Cascade)      |
| `note`       | STRING   |                               |
| `createdAt`  | DATETIME |                               |
| `updatedAt`  | DATETIME |                               |

**UNIQUE:** `(userId, exerciseId)` – jeden pending note na ćwiczenie na użytkownika.

## Enums

```prisma
enum MuscleGroup {
  CHEST | BACK | SHOULDERS | BICEPS | TRICEPS | FOREARMS | ABS
  OBLIQUES | LOWER_BACK | QUADS | HAMSTRINGS | GLUTES | CALVES
  ADDUCTORS | HIP_FLEXORS | TRAPS | LATS | MIDDLE_BACK | NECK | FULL_BODY
}

enum PhotoStage { START | MIDDLE | END }

enum WorkoutStatus { DRAFT | COMPLETED }
```

## Migracje

```bash
make migrate-dev   # prisma migrate dev – tworzy nową migrację (środowisko dev)
make migrate       # prisma migrate deploy – aplikuje migracje (prod/staging)
make migrate-reset # ⚠ reset DB i replay wszystkich migracji (niszczy dane)
```

Pliki migracji: `backend/prisma/migrations/`  
Schemat: `backend/prisma/schema.prisma`

## Tryb lokalny (DB_ENV=local)

Przełącznik `DB_ENV` w `.env` pozwala wybrać bazę danych bez zmiany URL:

| Wartość | Baza | Kiedy używać |
|---|---|---|
| `remote` (domyślne) | Supabase | prod / staging |
| `local` | Docker PostgreSQL, port 5433 | testowanie lokalne, development |

Potrzebne zmienne w `.env`:
```env
DB_ENV=remote
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
DIRECT_URL_LOCAL="postgresql://postgres:postgres@localhost:5433/gymgate_local"
```

### Pierwsze uruchomienie lokalnej bazy

```bash
cd backend
make local-setup   # start kontenera + migracje + seed (jednorazowo)
# Zmień DB_ENV=local w .env
make dev           # backend łączy się z lokalną bazą
```

### Dostępne komendy Makefile

```bash
make local-up       # uruchom kontener PostgreSQL (port 5433)
make local-down     # zatrzymaj kontener (dane w Docker volume przetrwają)
make local-migrate  # nałóż migracje na lokalną bazę
make local-seed     # seeduj: ćwiczenia + plany + testowy user z historią
make local-setup    # local-up + local-migrate + local-seed (first-time setup)
make local-reset    # local-migrate + local-seed (wyczyść i zaseeduj ponownie)
```

### Testowy użytkownik (seed-local)

| | |
|---|---|
| Email | `test@gymgate.com` |
| Hasło | `Test1234!` |
| Treningi | 16 zakończonych (4 typy: klatka / plecy / nogi / barki-ramiona, 4 cykle ~3 miesiące) |
| Dane | Progresja obciążeń widoczna, `ExerciseUserStats` wypełnione |
| Aktywny trening | 1 DRAFT (klatka, 2 ćwiczenia bez serii) |

Skrypt: `backend/prisma/seed-local.ts` — zawsze używa `DATABASE_URL_LOCAL`, niezależnie od `DB_ENV`.

## Uwagi implementacyjne

- `BigInt.prototype.toJSON` jest patchowany globalnie w `backend/src/index.ts` – umożliwia serializację BigInt do JSON.
- `DIRECT_URL` jest wymagany gdy `DATABASE_URL` przechodzi przez pooler (np. Supabase używa PgBouncer dla transakcyjnych połączeń).
- Singleton Prisma client (`config/database.ts`) zamykany jest gracefully przy `SIGTERM` / `SIGINT`.
