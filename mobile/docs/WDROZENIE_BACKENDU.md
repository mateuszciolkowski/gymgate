# Wdrożenie zmian backendu na produkcję

Punkt kontrolny D2: nic z tego nie dzieje się bez decyzji właściciela. Merge backendu do `main` uruchamia na Railway `prisma migrate deploy`, czyli migruje produkcyjną bazę.

Stan na 2026-11-15: zmiany są gotowe na gałęzi `mobile-migration`, przetestowane wyłącznie lokalnie (testy jednostkowe i integracyjne). Test dymny PWA na zmienionym backendzie: patrz `STATUS.md`, zadanie 4.10.

## Co się zmienia

| Migracja | Zawartość |
|---|---|
| `20261115120000_add_sync_changes` | tabela `sync_changes`, funkcje i wyzwalacze na 10 tabelach aplikacji |
| `20261116120000_add_sync_operations` | tabela `sync_operations` |
| `20261117120000_add_refresh_tokens` | tabela `refresh_tokens` |

Wszystkie są addytywne: nowe tabele i wyzwalacze, żadnych zmian w istniejących kolumnach. Stary kod backendu działa na nowym schemacie.

Nowe endpointy: `POST /api/sync/push`, `GET /api/sync/pull`, `POST /api/auth/mobile/{login,register,refresh,logout}`, `DELETE /api/auth/account`.

Zmiany widoczne dla PWA (naprawy błędów):

- `GET /api/exercises` i `GET /api/exercises/:id`: pole `creator` zawiera tylko `id`, imię, nazwisko i e-mail (wcześniej cały wiersz użytkownika z hashem hasła).
- `PATCH /api/workouts/:id` przyjmuje samą datę w `workoutDate`; edycja szczegółów treningu w PWA zaczyna działać. Sama data jest zapisywana jako północ UTC.
- `PATCH /api/workouts/sets/:setId`: 404 dla nieistniejącej serii zamiast 500, bez zapisu przed sprawdzeniem uprawnień.

## Kolejność

1. Backup produkcyjnej bazy (Supabase): `npm run backup:sql` z produkcyjnym adresem albo zrzut z panelu Supabase. Sprawdź, że plik powstał i nie jest pusty.
2. Merge `mobile-migration` do `dev`, potem do `main`. Railway uruchomi `prisma migrate deploy && node dist/index.js`.
3. W logach Railway sprawdź komunikat o zastosowaniu trzech migracji.
4. Test PWA na produkcji, pełna ścieżka: logowanie, nowy trening z planu, dodanie ćwiczenia, zapis i edycja serii, notatka, pominięcie ćwiczenia z planu, zakończenie, historia, statystyki, edycja planu, tryb offline i powrót sieci.
5. Dodatkowo: odpowiedź `GET /api/exercises` nie zawiera `password`; modal edycji treningu zapisuje zmiany.
6. Zmienne środowiskowe: bez nowych. `JWT_SECRET` zostaje ten sam.

Po wdrożeniu każdy zapis dopisuje mały wiersz do `sync_changes`. Wpisy starsze niż 90 dni usuwa zadanie uruchamiane przy starcie serwera i co 24 godziny (razem ze starymi `sync_operations` i wygasłymi tokenami odświeżania).

## Wycofanie

Kod: ponowny deploy poprzedniego commita `main`. Stary kod działa na nowym schemacie, więc cofanie migracji nie jest konieczne.

Jeśli trzeba usunąć także schemat (kolejność M3, M2, M1; żadne polecenie nie dotyka danych aplikacji):

```sql
-- M3 (apki tracą sesje; PWA bez wpływu)
DROP TABLE IF EXISTS "refresh_tokens";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261117120000_add_refresh_tokens';
-- M2
DROP TABLE IF EXISTS "sync_operations";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261116120000_add_sync_operations';
-- M1
DROP TRIGGER IF EXISTS gg_sync_workouts ON "workouts";
DROP TRIGGER IF EXISTS gg_sync_workout_items ON "workout_items";
DROP TRIGGER IF EXISTS gg_sync_workout_sets ON "workout_sets";
DROP TRIGGER IF EXISTS gg_sync_exercises ON "exercises";
DROP TRIGGER IF EXISTS gg_sync_exercise_photos ON "exercise_photos";
DROP TRIGGER IF EXISTS gg_sync_workout_plans ON "workout_plans";
DROP TRIGGER IF EXISTS gg_sync_workout_plan_items ON "workout_plan_items";
DROP TRIGGER IF EXISTS gg_sync_user_favorite_plans ON "user_favorite_plans";
DROP TRIGGER IF EXISTS gg_sync_exercise_pending_notes ON "exercise_pending_notes";
DROP TRIGGER IF EXISTS gg_sync_users ON "users";
DROP FUNCTION IF EXISTS gg_sync_log_change();
DROP FUNCTION IF EXISTS gg_sync_log_plan(TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS gg_sync_log_exercise(TEXT, TEXT);
DROP TABLE IF EXISTS "sync_changes";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261115120000_add_sync_changes';
```

## Niesprawdzone

- Wydajność `pull` na dzienniku wielkości produkcyjnej (zapytanie używa indeksu, ale nie było profilowane).
- Limity żądań (logowanie, push, pull) są wyłączone w testach; sprawdzone tylko testem jednostkowym trasy.
