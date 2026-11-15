# Migracja mobilna: tablica postępu

Zlecenie i zasady: [`MIGRACJA_MOBILE.md`](../../MIGRACJA_MOBILE.md). Ten plik mówi, co jest zrobione, co trwa i co dalej. Aktualizowany po każdym zakończonym kroku.

Oznaczenia: `[x]` zrobione i sprawdzone, `[~]` w trakcie, `[ ]` do zrobienia, `[!]` zablokowane (powód obok).

**Ostatnia aktualizacja:** 2026-11-15
**Bieżący etap:** 3, 4 i 5 równolegle, sesja lokalna na MacBooku (sesja chmurowa wyłączona).
**Następny krok:** w toku 4.5–4.8 (backend), 3.5–3.6 z ekranami logowania (apka), 5.1 z outboxem i statystykami (apka). Potem 5.2 (silnik push/pull) i 4.9–4.10.

## Przegląd etapów

| Etap | Zakres | Gdzie | Stan |
|---|---|---|---|
| 0 | Rozpoznanie i środowisko | chmura / Mac | ukończony (pytania o hosting odłożone) |
| 1 | Pełna inwentaryzacja PWA, lista parytetu, zrzuty wzorcowe | chmura / Mac | ukończony poza brakującymi zrzutami stanów |
| 2 | Szczegółowy plan (architektura, synchronizacja, zadania) | chmura / Mac | ukończony |
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

- [x] `INWENTARYZACJA.md`: 12 sekcji (ekrany, nawigacja, logika klienta, warstwa danych, API, zastane błędy, system wizualny)
- [x] `tokeny-motywow.json`: wartości wszystkich 12 motywów wyciągnięte skryptem z `index.css`
- [x] `PARYTET.md`: 243 pozycje w 16 grupach
- [~] `wzorzec/`: zrzuty ekranów PWA (iPhone 15 Pro). Jest: 23 ekrany w `dark` i `light`, lista treningów i aktywny trening w pozostałych 10 motywach. Brakuje stanów: szkic i edycja serii, notatka ćwiczenia, podpowiedź z planu, modal nowego treningu i edycji treningu, rozwinięty plan, historia planu, edycja ćwiczenia, zdjęcie ćwiczenia, stany puste, banery offline i błędu synchronizacji, dialog porzuconego treningu, widok admina
- [ ] Dokładne wymiary komponentów (odstępy, rozmiary ikon): odczytywane z plików źródłowych przy budowie każdego ekranu

Najważniejsze znaleziska (pełna lista: `INWENTARYZACJA.md`, sekcja 11):

- **B1: edycja szczegółów treningu w PWA nie działa online.** Modal wysyła samą datę, backend wymaga pełnego znacznika czasu i odrzuca żądanie; nie zapisuje się też nazwa, siłownia ani czas. Błąd produkcyjny, niezależny od migracji.
- **B2: `GET /api/exercises` zwraca hash hasła twórcy ćwiczenia.**
- **B4: pominięcie ćwiczenia z planu offline nie jest synchronizowane.**
- **B6: „Odśwież pamięć podręczną” i wylogowanie kasują niewysłane zmiany bez ostrzeżenia.**

## Etap 2: plan

- [x] `PLAN.md`: biblioteki (po sprawdzeniu stanu Expo, `expo-widgets`, Drizzle, Notifee), struktura apki, mapa nawigacji
- [x] `PLAN.md`: schemat lokalnej bazy i reguły zapisu
- [x] `PLAN.md`: synchronizacja (operacje, push, pull, kursor, konflikty, odrzucenia, widoczny stan)
- [x] `PLAN.md`: zmiany w backendzie (3 migracje, endpointy, minimalne zmiany istniejącego kodu)
- [x] `PLAN.md`: sesja, statystyki lokalne, strategia testów, zadania etapów 3–15
- [x] `DECYZJE.md`: 26 decyzji i odstępstw

Do przejrzenia przez właściciela w dowolnym momencie (nie blokuje pracy): `PLAN.md` sekcje 5–7 oraz `DECYZJE.md`, zwłaszcza D-03 (wyzwalacze w bazie), D-05 (statystyki tylko lokalnie), D-11 (naprawa błędu B1 w backendzie).

## Etap 3: fundament (Mac; część w chmurze)

- [x] 3.1 Projekt Expo SDK 58 (Node 24), TypeScript strict, lint, skrypty; typecheck, lint i 65 testów przechodzą
- [x] 3.2 `domain/`: logika przeniesiona z PWA z testami
- [x] 3.3 Motywy: generator z `tokeny-motywow.json`, kontekst, zapis wyboru (na symulatorze widziany tylko `dark`)
- [x] 3.4 Fonty i ikony
- [~] 3.5 Komponenty bazowe
- [~] 3.6 Szkielet nawigacji z dolnym paskiem i szufladą (trasy są; pasek i szuflada w trakcie)
- [x] 3.7 Klient API, środowiska, bezpieczny magazyn (testy z atrapą `fetch`; bez próby na żywym backendzie)
- [~] 3.8 Development build: iOS uruchamia się na symulatorze (`zrzuty/etap3-boot.png`), Maestro 2.12 zainstalowane; Android `[!]` brak SDK (Android Studio po stronie właściciela)
- [x] 3.9 `mobile-ci.yml` (jeszcze nieuruchomiony w GitHub Actions)

## Etap 4: backend pod synchronizację (chmura)

- [x] 4.1 Infrastruktura testów integracyjnych: `npm run test:integration` w `backend/` (pliki `*.itest.ts`, baza `gymgate_test` na localhost; skrypt odmawia pracy na bazie spoza localhost lub bez sufiksu `_test`)
- [x] 4.2 Migracja M1 `20261115120000_add_sync_changes`: tabela + wyzwalacze na 10 tabelach; 18 testów integracyjnych (zapisy przez istniejące serwisy, kaskady, widoczność planów); `npm test` 203/203, test dymny PWA 12/12 na bazie z wyzwalaczami; brak dryfu schematu Prisma
- [x] 4.3 Eksport funkcji pochodnych, opcjonalne `id` i czasy w repozytoriach (`npm test` 229/229)
- [x] 4.4 Migracja M2 `20261116120000_add_sync_operations` + `POST /api/sync/push` (testy integracyjne 56/56; test dymny PWA jeszcze nie powtórzony, patrz 4.10)
- [x] 4.5 `GET /api/sync/pull` (w tym test kursora przy równoległych transakcjach)
- [x] 4.6 Migracja M3 `20261117120000_add_refresh_tokens` + sesje mobilne
- [x] 4.7 `DELETE /api/auth/account`
- [x] 4.8 Naprawy B2, B8, B1 (`npm test` 243/243, integracyjne 109/109)
- [x] 4.9 `API.md`, `openapi.yaml`, `WDROZENIE_BACKENDU.md`
- [~] 4.10 Regresja: backend 244 jednostkowe, frontend 78/78 (według agenta); test dymny PWA rozszerzony do 28 kroków (plany, trening z planu, edycja serii i szczegółów, offline), według agenta 28/28 na zmienionym backendzie; przeciągania kolejności w planie test nie obejmuje. Do powtórzenia: pełne testy integracyjne na nieobciążonej maszynie (pod obciążeniem symulatora 1 test `sync-push` przekroczył czas)

## Etap 5: pionowy wycinek

- [x] 5.1 Schemat lokalnej bazy, migracje, repozytoria, outbox, zegar, statystyki lokalne (110 testów w Node; otwarcie bazy przez `expo-sqlite` niesprawdzone na symulatorze)
- [x] 5.2 Outbox, push, pull, silnik, zegar (testy w Node)
- [x] 5.3 Testy protokołu przeciwko lokalnemu backendowi: `npm run test:protocol`, według agenta 13/13 (scenariusze 6.8 możliwe bez urządzenia); `resyncRequired` tylko testem z atrapą
- [x] 5.4 Sesja mobilna: logika (bez podpięcia do ekranów i bez próby na symulatorze)
- [ ] 5.5 Ekrany minimalne (Mac)
- [ ] 5.6 Maestro: tryb samolotowy, zabicie apki (Mac)
- [ ] 5.7 Instrukcja wgrania na iPhone'a

## Etapy 6–15

Zakres każdego etapu to grupy z `PARYTET.md` wskazane w `PLAN.md`, sekcja 10. Listy zadań rozpisujemy tutaj przy wejściu w dany etap.

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

- `mobile/` wymaga Node 24 (Expo SDK 58), `backend/` zostaje na Node 20.
- Runtime symulatora iOS 27.1 nie obsługuje zwykłych iPhone'ów; używamy iOS 27.0.
- `tokeny-motywow.json`: wartość `--gg-btn-hover` motywu `dark` ma błąd ekstrakcji; generator motywów nadpisuje ją wartością z `index.css`.

- Po restarcie kontenera chmurowego proces PostgreSQL znika, ale dane w `/var/lib/postgresql/gymgate_local` zostają: wystarczy `pg_ctl start` (polecenie w dzienniku sesji 2026-11-15), bez ponownego seeda.
- Test dymny i zrzuty zmieniają lub zakładają dane z seeda: przed każdym uruchomieniem `npm run seed:local` (z lokalnym `DATABASE_URL`), a po kilku uruchomieniach restart backendu, bo limit logowań jest w pamięci procesu.
- Sesja chmurowa nie ma Dockera, więc `make local-setup` tu nie działa. Zamiast tego: systemowy PostgreSQL 16 na `127.0.0.1:5433`, baza `gymgate_local`, migracje i seedy z jawnie podstawionym `DATABASE_URL`/`DIRECT_URL`. Kontener sesji jest ulotny, więc w nowej sesji chmurowej bazę trzeba postawić od nowa.
- Limit logowań backendu (10 prób na 15 minut na IP) blokuje automaty logujące się wielokrotnie; `capture.mjs` loguje się raz przez API i wstrzykuje sesję.
- Użytkownik testowy z `seed-local.ts` ma identyfikator `local-test-user-1`, który nie jest UUID. Schematy Zod wymagają UUID tylko dla części pól; do uwzględnienia przy projektowaniu synchronizacji.
- Zastane błędy w kodzie: lista w `MIGRACJA_MOBILE.md`, sekcja 1.11.

## Dziennik sesji

- **2026-11-15 (MacBook):** `backend/.env` przełączony na `DB_ENV=local`, produkcyjne adresy zakomentowane. Lokalna baza w Dockerze (`make -C backend local-up`), symulator „GymGate iPhone 15 Pro” (iOS 27.0). Zadania 4.3–4.4 i 3.1–3.4, 3.7, 3.9, część 3.8. Praca dzielona na podagentów; commity po przeglądzie, bez pusha.

- **2026-11-15 (chmura, po restarcie procesu):** lista parytetu, plan (Etap 2), rejestr decyzji, zadania 4.1–4.2 backendu. Start bazy: `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/gymgate_local -o '-p 5433 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/var/lib/postgresql/gymgate_local' -l /var/lib/postgresql/gymgate_local/server.log start"`; lokalna baza i serwery zniknęły z kontenera, do postawienia ponownie przed testami backendu.
- **2026-11-14 (chmura):** analiza repo, brief, decyzje D1–D6, gałąź, stan wyjściowy testów, ta tablica. Lokalna baza, backend i PWA uruchomione; skrypt `mobile/tools/pwa-wzorzec/capture.mjs` i pierwsza partia zrzutów wzorcowych, test dymny PWA (12/12), pełna inwentaryzacja.
