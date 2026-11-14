# Migracja mobilna: tablica postępu

Zlecenie i zasady: [`MIGRACJA_MOBILE.md`](../../MIGRACJA_MOBILE.md). Ten plik mówi, co jest zrobione, co trwa i co dalej. Aktualizowany po każdym zakończonym kroku.

Oznaczenia: `[x]` zrobione i sprawdzone, `[~]` w trakcie, `[ ]` do zrobienia, `[!]` zablokowane (powód obok).

**Ostatnia aktualizacja:** 2026-11-14
**Bieżący etap:** 1 (inwentaryzacja)
**Następny krok:** `INWENTARYZACJA.md` (Etap 1)

## Przegląd etapów

| Etap | Zakres | Gdzie | Stan |
|---|---|---|---|
| 0 | Rozpoznanie i środowisko | chmura / Mac | ukończony (pytania o hosting odłożone) |
| 1 | Pełna inwentaryzacja PWA, lista parytetu, zrzuty wzorcowe | chmura / Mac | w trakcie |
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
- [x] Lokalna baza PostgreSQL z migracjami i danymi z `seed-local.ts` (15 migracji, 16 treningów zakończonych + 1 aktywny)
- [x] Backend uruchomiony lokalnie z `DB_ENV=local`, PWA lokalnie na tym backendzie (logowanie i wszystkie zakładki działają)
- [x] Przejście pełnej ścieżki treningu w lokalnym PWA z zapisem danych: `node mobile/tools/pwa-smoke/smoke.mjs`, 12/12 kroków (logowanie formularzem, blokada zakończenia bez serii, 2 serie, notatka, zakończenie, historia, statystyki i rekord, baner offline)
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
- [~] `wzorzec/`: zrzuty ekranów PWA (iPhone 15 Pro). Jest: 23 ekrany w `dark` i `light`, lista treningów i aktywny trening w pozostałych 10 motywach. Brakuje stanów: szkic i edycja serii, notatka ćwiczenia, podpowiedź z planu, modal nowego treningu i edycji treningu, rozwinięty plan, historia planu, edycja ćwiczenia, zdjęcie ćwiczenia, stany puste, banery offline i błędu synchronizacji, dialog porzuconego treningu, widok admina

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

Buildy (`npm run build`) nie były jeszcze uruchamiane.

## Ustalenia o deployu

Z repo:

- Railway uruchamia backend przez `prisma migrate deploy && node dist/index.js`: każdy deploy backendu migruje produkcyjną bazę.
- CI odpala się tylko na PR i push do `main`.
- `DB_ENV` domyślnie `remote`: backend bez `DB_ENV=local` łączy się z `DATABASE_URL` z `backend/.env`.

Do potwierdzenia przez właściciela (patrz `DLA_MATEUSZA.md`, gdy powstanie):

- [ ] Z jakiej gałęzi Railway robi deploy i czy reaguje na zmiany poza `backend/`
- [ ] Czy Vercel buduje podglądy z gałęzi innych niż `main` i na jakie API wskazują
- [ ] Czy `backend/.env` na MacBooku zawiera produkcyjny adres bazy

Stan na 2026-11-14: właściciel nie zna jeszcze odpowiedzi; pytania odłożone, nie blokują etapów 0–3. Właściciel ma własny VPS z Coolify i dopuszcza przeniesienie hostingu tam (kod backendu już to przewiduje: `trust proxy` w `app.ts` wspomina Traefik na Coolify). Do rozważenia w Etapie 2: osobna instancja backendu z osobną bazą na VPS jako środowisko testowe apki, co pozwoliłoby testować na telefonie poza domowym Wi-Fi bez dotykania produkcji (łagodzi skutek decyzji D6).

Do czasu odpowiedzi: zakładam, że push na `mobile-migration` może zbudować podgląd Vercel, więc nie zmieniam niczego w `frontend/`.

## Znane problemy

- Test dymny i zrzuty zmieniają lub zakładają dane z seeda: przed każdym uruchomieniem `npm run seed:local` (z lokalnym `DATABASE_URL`), a po kilku uruchomieniach restart backendu, bo limit logowań jest w pamięci procesu.
- Sesja chmurowa nie ma Dockera, więc `make local-setup` tu nie działa. Zamiast tego: systemowy PostgreSQL 16 na `127.0.0.1:5433`, baza `gymgate_local`, migracje i seedy z jawnie podstawionym `DATABASE_URL`/`DIRECT_URL`. Kontener sesji jest ulotny, więc w nowej sesji chmurowej bazę trzeba postawić od nowa.
- Limit logowań backendu (10 prób na 15 minut na IP) blokuje automaty logujące się wielokrotnie; `capture.mjs` loguje się raz przez API i wstrzykuje sesję.
- Użytkownik testowy z `seed-local.ts` ma identyfikator `local-test-user-1`, który nie jest UUID. Schematy Zod wymagają UUID tylko dla części pól; do uwzględnienia przy projektowaniu synchronizacji.
- Zastane błędy w kodzie: lista w `MIGRACJA_MOBILE.md`, sekcja 1.11.

## Dziennik sesji

- **2026-11-14 (chmura):** analiza repo, brief, decyzje D1–D6, gałąź, stan wyjściowy testów, ta tablica. Lokalna baza, backend i PWA uruchomione; skrypt `mobile/tools/pwa-wzorzec/capture.mjs` i pierwsza partia zrzutów wzorcowych.
