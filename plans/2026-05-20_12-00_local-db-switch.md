# Plan: Przełącznik DB_ENV (local vs remote)

**Data:** 2026-05-20  
**Status:** Wdrożony

## Cel

Dodać zmienną `DB_ENV=local|remote` w `.env`, która przełącza bazę danych między:
- `remote` (Supabase) — domyślne
- `local` (lokalny PostgreSQL w Dockerze, port 5433) — z pełnym seedem testowym

## Pliki

| Plik | Akcja |
|---|---|
| `backend/src/config/database.ts` | MODIFY — wybiera URL na podstawie `DB_ENV` |
| `backend/.env.example` | MODIFY — dokumentuje nowe zmienne |
| `backend/docker-compose.local.yml` | NEW — postgres:16 na porcie 5433 |
| `backend/prisma/seed-local.ts` | NEW — user testowy + 15 zakończonych treningów + stats |
| `backend/package.json` | MODIFY — skrypty `seed:local`, `db:local:up`, `db:local:down` |
| `backend/Makefile` | MODIFY — sekcja "Local Test Database" z opisami |
| `docs/modules/database.md` | MODIFY — sekcja "Tryb lokalny (DB_ENV=local)" |

## Mechanizm

`.env` zawiera:
```
DB_ENV=remote
DATABASE_URL=...supabase...
DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:5433/gymgate_local
DIRECT_URL_LOCAL=postgresql://postgres:postgres@localhost:5433/gymgate_local
```

`database.ts` czyta `DB_ENV` i wybiera odpowiedni URL.  
`seed-local.ts` tworzy własny `PrismaClient` z `DATABASE_URL_LOCAL` (niezależny od `DB_ENV`).

## Workflow lokalnej bazy

```bash
make local-setup   # start + migrate + seed (jednorazowe)
# w .env: zmień DB_ENV=local
npm run dev        # backend łączy się z lokalną bazą
make local-down    # zatrzymaj kontener (dane zachowane w Docker volume)
```

## Dane testowe (seed-local)

- User: `test@gymgate.com` / `Test1234!`
- ~85 ćwiczeń (identyczne jak seed.ts)
- 15 zakończonych treningów (3 miesiące wstecz): klatka / plecy / nogi / barki-ramiona
- Progresja obciążeń widoczna w historii
- Wypełnione `ExerciseUserStats` (sugestie wagi działają)
- 1 aktywny trening DRAFT
- Wbudowane plany treningowe (FBW, PPL)
