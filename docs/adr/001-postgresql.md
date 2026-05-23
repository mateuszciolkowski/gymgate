# ADR-001 – PostgreSQL as the Database

**Status:** Accepted  
**Date:** 2024

## Context

The project requires a relational database to store workouts, exercises, sets, and statistics. Data is strongly related (User → Workout → WorkoutItem → WorkoutSet), and referential integrity is critical.

## Decision

**PostgreSQL 16** was chosen, managed by Supabase (production) and Docker (`postgres:16-alpine`) for local development.

## Rationale

- **Relational model** – the domain model relies on cascading dependencies (Cascade delete), which SQL handles natively.
- **Prisma support** – Prisma ORM has first-class support for PostgreSQL, including types like `Decimal(6,2)` needed for weights.
- **Supabase** – provides hosted PG without infrastructure management, with a built-in connection pooler (PgBouncer).
- **Enum arrays** (`MuscleGroup[]`) – PostgreSQL natively supports array enum columns used for muscle groups.
- **Maturity** – proven technology with a broad community and ecosystem.

## Consequences

- `DATABASE_URL` and `DIRECT_URL` are required (for migrations through a pooler).
- `BigInt` requires `toJSON` patching (patch applied in `index.ts`).
- Local environment requires running Docker or access to an external PG instance.

## Alternatives Considered

- **SQLite** – rejected due to lack of enum array support and the need for a hosted database.
- **MongoDB** – rejected due to the strongly relational data structure of the project.
