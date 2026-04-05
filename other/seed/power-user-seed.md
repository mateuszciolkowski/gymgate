# power-user-seed

Ten seed jest w pliku SQL: `power-user-seed.sql`.

Tworzy jednego uzytkownika z duza historia:
- 30 zakonczonych treningow (`COMPLETED`)
- kilka wlasnych cwiczen (`creatorUserId = user.id`)
- uzupelnione `exercise_user_stats`
- dodatkowo kazde wlasne cwiczenie ma dedykowana sesje z seriami i ciezarami (pelne pokrycie statystyk)

## Dane logowania

- **email:** `power.user@gymgate.local`
- **haslo:** `PowerUser123!`
- **imie/nazwisko:** `Power User`

Jesli seed byl odpalony starsza wersja pliku, uruchom go ponownie, aby nadpisac haslo.

## Jak wrzucic SQL do bazy

1. Upewnij sie, ze masz ustawione `DATABASE_URL` i wykonane migracje.
2. Zalecana metoda (dziala dobrze z Docker + Supabase):

```bash
cd backend
npx prisma db execute --schema prisma/schema.prisma --file ../other/seed/power-user-seed.sql
```

### Docker + Supabase

W tym repo usluga compose nazywa sie `gg_api` (nie `backend`).

### Import przez `psql` (opcjonalnie)

Jesli masz lokalnie `psql`, mozesz tez uzyc:

```bash
cd backend
psql "$DATABASE_URL" -f ../other/seed/power-user-seed.sql
```

Jesli chcesz uruchomic import przez `psql`, uzyj tymczasowego kontenera Postgresa:

```bash
docker run --rm -e DATABASE_URL="$DATABASE_URL" -i postgres:16 \
  sh -lc 'psql "$DATABASE_URL"' < other/seed/power-user-seed.sql
```

Gdy jestes juz w katalogu `backend`, uzyj:

```bash
docker run --rm -e DATABASE_URL="$DATABASE_URL" -i postgres:16 \
  sh -lc 'psql "$DATABASE_URL"' < ../other/seed/power-user-seed.sql
```

`DATABASE_URL` moze wskazywac na Supabase (zwykle z `sslmode=require`).

## Co seed czyści i co zostawia

- Czyści tylko dane tego jednego konta (`power.user@gymgate.local`):
  - treningi
  - statystyki
  - jego wlasne cwiczenia
- Nie czyści danych innych uzytkownikow.

## Szybka weryfikacja (opcjonalnie)

```bash
cd backend
npx prisma studio
```

Sprawdz:
- `users` (email: `power.user@gymgate.local`)
- `workouts` (status: `COMPLETED`)
- `exercise_user_stats`
