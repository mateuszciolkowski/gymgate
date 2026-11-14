# Migracja mobilna: tablica postępu

Zlecenie i zasady: [`MIGRACJA_MOBILE.md`](../../MIGRACJA_MOBILE.md). Ten plik mówi, co jest zrobione, co trwa i co dalej. Aktualizowany po każdym zakończonym kroku.

Oznaczenia: `[x]` zrobione i sprawdzone, `[~]` w trakcie, `[ ]` do zrobienia, `[!]` zablokowane (powód obok).

**Ostatnia aktualizacja:** 2026-11-14
**Bieżący etap:** 0 (rozpoznanie i środowisko)
**Następny krok:** lokalna baza i uruchomienie backendu z PWA (Etap 0), potem inwentaryzacja (Etap 1)

## Przegląd etapów

| Etap | Zakres | Gdzie | Stan |
|---|---|---|---|
| 0 | Rozpoznanie i środowisko | chmura / Mac | w trakcie |
| 1 | Pełna inwentaryzacja PWA, lista parytetu, zrzuty wzorcowe | chmura / Mac | do zrobienia |
| 2 | Szczegółowy plan (architektura, synchronizacja, zadania) | chmura / Mac | do zrobienia |
| 3 | Fundament apki (Expo, motywy, komponenty, buildy) | Mac | do zrobienia |
| 4 | Backend pod synchronizację | chmura / Mac | do zrobienia |
| 5 | Pionowy wycinek: trening offline + synchronizacja | Mac | do zrobienia |
| 6 | Logowanie, rejestracja, sesja | Mac | do zrobienia |
| 7 | Ćwiczenia | Mac | do zrobienia |
| 8 | Plany | Mac | do zrobienia |
| 9 | Trening | Mac | do zrobienia |
| 10 | Statystyki | Mac | do zrobienia |
| 11 | Ustawienia i usuwanie konta | Mac | do zrobienia |
| 12 | Live Activity i powiadomienie | Mac | do zrobienia |
| 13 | Natywne wykończenie | Mac | do zrobienia |
| 14 | Końcowy audyt parytetu | Mac | do zrobienia |
| 15 | Przygotowanie do publikacji | Mac | do zrobienia |
| — | Wdrożenie backendu na produkcję | właściciel | czeka na decyzję (punkt kontrolny D2) |

„Mac” oznacza sesję Claude Code lokalnie na MacBooku (symulator iOS, Xcode, emulator Androida). Szczegółowe zadania etapów 3–15 powstaną w `PLAN.md` w Etapie 2; poniższe listy są szkieletem.

## Etap 0: rozpoznanie i środowisko

- [x] Analiza repo i brief dopasowany do kodu (`MIGRACJA_MOBILE.md`)
- [x] Decyzje właściciela D1–D6 potwierdzone
- [x] Gałąź `mobile-migration` utworzona z `dev` (`cca3455`)
- [x] Stan wyjściowy testów zapisany (niżej)
- [ ] Lokalna baza PostgreSQL z migracjami i danymi z `seed-local.ts`
- [ ] Backend uruchomiony lokalnie z `DB_ENV=local`, PWA lokalnie na tym backendzie
- [ ] Ręczne przejście pełnej ścieżki treningu w lokalnym PWA
- [ ] Ustalenia o deployu (niżej) uzupełnione odpowiedziami właściciela

## Etap 1: inwentaryzacja

- [ ] `INWENTARYZACJA.md`: ekrany, modale, banery, mapa przejść
- [ ] `INWENTARYZACJA.md`: API (każdy endpoint, błędy, miejsca użycia)
- [ ] `INWENTARYZACJA.md`: logika klienta i przypadki brzegowe z testów
- [ ] `INWENTARYZACJA.md`: tokeny 12 motywów, typografia, wymiary, animacje
- [ ] `INWENTARYZACJA.md`: wszystkie teksty interfejsu
- [ ] `INWENTARYZACJA.md`: zachowania przeglądarkowe i ich natywne odpowiedniki
- [ ] `INWENTARYZACJA.md`: zastane błędy
- [ ] `PARYTET.md`: lista kontrolna każdej funkcji i stanu
- [ ] `wzorzec/`: zrzuty ekranów PWA (iPhone 15 Pro; `dark` i `light` komplet, kluczowe ekrany w 12 motywach)

## Etap 2: plan

- [ ] Architektura apki i struktura folderów
- [ ] Biblioteki z uzasadnieniem (po sprawdzeniu aktualnej dokumentacji)
- [ ] Mapa nawigacji
- [ ] Schemat lokalnej bazy
- [ ] Projekt synchronizacji: push/pull, kursor, dziennik usunięć, znaczniki czasu, konflikty, odrzucenia, sesja
- [ ] Lista migracji i endpointów backendu
- [ ] Strategia testów
- [ ] Zadania etapów 3–15 z kryteriami ukończenia (przeniesione do tego pliku)

## Etapy 3–15

Listy zadań zostaną wpisane tutaj po Etapie 2.

## Stan wyjściowy testów (2026-11-14, commit `cca3455`)

| Część | Polecenie | Wynik |
|---|---|---|
| Backend | `npm run typecheck` | bez błędów |
| Backend | `npm test` | 203 testy w 20 plikach, wszystkie przechodzą |
| Frontend | `npm run typecheck` | bez błędów |
| Frontend | `npm test` | 78 testów w 10 plikach, wszystkie przechodzą |
| Frontend | `npm run lint` | 25 zastanych problemów (19 błędów, 6 ostrzeżeń), m.in. `react-hooks/set-state-in-effect`; lint nie jest częścią CI |

Buildy (`npm run build`) nie były jeszcze uruchamiane. Backend i PWA nie były jeszcze uruchamiane lokalnie.

## Ustalenia o deployu

Z repo:

- Railway uruchamia backend przez `prisma migrate deploy && node dist/index.js`: każdy deploy backendu migruje produkcyjną bazę.
- CI odpala się tylko na PR i push do `main`.
- `DB_ENV` domyślnie `remote`: backend bez `DB_ENV=local` łączy się z `DATABASE_URL` z `backend/.env`.

Do potwierdzenia przez właściciela (patrz `DLA_MATEUSZA.md`, gdy powstanie):

- [ ] Z jakiej gałęzi Railway robi deploy i czy reaguje na zmiany poza `backend/`
- [ ] Czy Vercel buduje podglądy z gałęzi innych niż `main` i na jakie API wskazują
- [ ] Czy `backend/.env` na MacBooku zawiera produkcyjny adres bazy

Do czasu odpowiedzi: zakładam, że push na `mobile-migration` może zbudować podgląd Vercel, więc nie zmieniam niczego w `frontend/`.

## Znane problemy

- Sesja chmurowa nie ma Dockera, więc `make local-setup` tu nie zadziała. PostgreSQL 16 jest zainstalowany w systemie i może posłużyć jako lokalna baza na porcie 5433.
- Zastane błędy w kodzie: lista w `MIGRACJA_MOBILE.md`, sekcja 1.11.

## Dziennik sesji

- **2026-11-14 (chmura):** analiza repo, brief, decyzje D1–D6, gałąź, stan wyjściowy testów, ta tablica.
