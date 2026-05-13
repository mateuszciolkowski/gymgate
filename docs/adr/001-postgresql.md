# ADR-001 – PostgreSQL jako baza danych

**Status:** Zaakceptowany  
**Data:** 2024

## Kontekst

Projekt wymaga relacyjnej bazy danych do przechowywania treningów, ćwiczeń, serii i statystyk. Dane są silnie powiązane relacyjnie (User → Workout → WorkoutItem → WorkoutSet), a integralność referencyjna jest krytyczna.

## Decyzja

Wybrano **PostgreSQL 16** zarządzany przez Supabase (produkcja) i Docker (`postgres:16-alpine`) do lokalnego developmentu.

## Uzasadnienie

- **Relacyjność** – model domenowy opiera się na kaskadowych zależnościach (Cascade delete), które SQL obsługuje natywnie.
- **Prisma support** – Prisma ORM ma pierwszorzędne wsparcie dla PostgreSQL, w tym typy takie jak `Decimal(6,2)` niezbędne dla ciężarów.
- **Supabase** – zapewnia hosting PG bez zarządzania infrastrukturą, z wbudowanym connection pooler (PgBouncer).
- **Enum arrays** (`MuscleGroup[]`) – PostgreSQL natywnie obsługuje tablicowe kolumny enum używane dla grup mięśniowych.
- **Dojrzałość** – sprawdzona technologia z szeroką społecznością i ekosystemem.

## Konsekwencje

- Wymagane są `DATABASE_URL` i `DIRECT_URL` (dla migracji przez pooler).
- `BigInt` wymaga patchowania `toJSON` (patch zastosowany w `index.ts`).
- Lokalne środowisko wymaga uruchomionego Dockera lub dostępu do zewnętrznej instancji PG.

## Rozważane alternatywy

- **SQLite** – pominięty ze względu na brak wsparcia dla enum arrays i potrzebę hostowanej bazy.
- **MongoDB** – pominięty ze względu na silnie relacyjną strukturę danych projektu.
