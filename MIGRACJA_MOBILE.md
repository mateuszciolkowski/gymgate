# GymGate: migracja PWA → aplikacja mobilna (Expo / React Native)

Stałe zlecenie dla Claude Code. Każdą sesję pracy zaczynasz od przeczytania tego pliku w całości, potem `mobile/docs/STATUS.md` i `mobile/docs/PLAN.md` (jeśli istnieją), i kontynuujesz od miejsca, w którym skończyła się poprzednia sesja.

Ten plik został dopasowany do faktycznego stanu repo (gałąź `dev`, commit `cca3455`). Sekcja 1 opisuje, co w repo jest naprawdę. Jeśli kod i ten plik się rozjadą, wygrywa kod, a różnicę zapisujesz w `mobile/docs/DECYZJE.md`.

Nadal obowiązują `CLAUDE.md`, `backend/CLAUDE.md` i `frontend/CLAUDE.md`, w szczególności: backup SQL przed każdą migracją, warstwy `routes → controller → service → repository`, aktualizacja `backend/src/modules/<moduł>/API.md` i `docs/api/openapi.yaml` po każdej zmianie API.

---

## 0. Decyzje właściciela (do potwierdzenia)

Poniżej przyjęte wartości domyślne. Dopóki właściciel ich nie zmieni, obowiązują.

| # | Temat | Domyślnie |
|---|---|---|
| D1 | **Odliczanie przerwy między seriami.** PWA go nie ma (jest tylko czas treningu). | Nie implementujemy. Live Activity i powiadomienie pokazują czas treningu, bieżące ćwiczenie i liczbę serii. Architektura zostawia miejsce na timer przerwy później. |
| D2 | **Punkty kontrolne.** | Trzy obowiązkowe przystanki na przegląd właściciela: po `PLAN.md` (Etap 2), po pionowym wycinku na iPhonie (Etap 5), przed każdym mergem zmian backendu do `main`. Poza nimi pełna autonomia. |
| D3 | **Edycja planów offline.** W PWA plany są online-only. | Apka pozwala na to offline (zgodnie z wymogiem offline-first), a odrzucenia serwera pokazuje po synchronizacji (sekcja 6.5). |
| D4 | **Usuwanie konta.** PWA i backend go nie mają. | Dodajemy (endpoint + ekran) jako jedyny wyjątek od „bez nowych funkcji”, bo wymaga tego Apple. |
| D5 | **Odświeżanie sesji.** Backend wydaje jeden JWT na 7 dni, bez refresh tokenu. | Dodajemy refresh token tylko dla apki (addytywnie); PWA dalej używa 7-dniowego JWT. |

---

## 1. Stan faktyczny repo

### 1.1 Struktura i narzędzia

- Trzy niezależne części, każda z własnym `package.json` i `package-lock.json` (npm, Node 20): `backend/`, `frontend/`, a w korzeniu tylko `Makefile`, dokumentacja (`docs/`, `plans/`) i `.github/`. Nie ma workspace'ów. `mobile/` dochodzi jako czwarty folder bez ruszania pozostałych.
- Gałęzie: `main` (produkcja), `dev` (integracyjna, obecnie 6 commitów przed `main`), gałęzie funkcyjne. CI (`backend-ci.yml`, `frontend-ci.yml`) odpala się wyłącznie na PR i push do `main`, z filtrem ścieżek. Dla `mobile/` nie ma jeszcze workflow.
- Backend: Express 5, TypeScript, Prisma 5.22, PostgreSQL, Zod 4, Vitest + Supertest. Testy mockują repozytoria, nie potrzebują bazy.
- Frontend: React 19, Vite 7, Tailwind 4, Context API, `vite-plugin-pwa`, `@dnd-kit`, Vitest (jsdom + fake-indexeddb). Playwright jest w devDependencies, ale nie ma zestawu testów E2E.

### 1.2 Deploy i ryzyka dla produkcji

- Backend: Railway (Nixpacks), komenda startowa `npm run start:railway` = `prisma migrate deploy && node dist/index.js`. **Każdy deploy backendu automatycznie wykonuje zaległe migracje na produkcyjnej bazie (Supabase).**
- Frontend: Vercel (`frontend/vercel.json`), produkcja pod `gymgate.vercel.app`.
- **`DB_ENV` domyślnie ma wartość `remote`.** `backend/src/config/database.ts` łączy się wtedy z `DATABASE_URL`, czyli z produkcyjnym Supabase, jeśli taki adres jest w `backend/.env`. Lokalny backend uruchomiony bez `DB_ENV=local` pracuje na danych produkcyjnych.
- **Polecenia Prisma nie patrzą na `DB_ENV`.** `npx prisma migrate dev`, `make migrate`, `make migrate-dev`, `make migrate-reset` używają `DATABASE_URL` z `.env`. Bezpieczne są tylko cele `make local-*`, które jawnie podstawiają `postgresql://postgres:postgres@localhost:5433/gymgate_local`.
- Nie da się z repo ustalić: z jakiej gałęzi Railway robi deploy, czy Vercel buduje podglądy z innych gałęzi i na jakie API one wskazują. To ustala Etap 0.

### 1.3 Uwierzytelnianie

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Rate limit: 10 prób na 15 minut na IP dla logowania i rejestracji.
- Odpowiedź zawiera `{ user, token }`. Token to JWT ważny 7 dni z `userId`, `email`, `isAdmin`. Wysyłany w nagłówku `Authorization: Bearer`. PWA trzyma go w `localStorage` (`gymgate_token`, `gymgate_user`). Zapis w `CLAUDE.md` i `PRODUCT.md` o ciasteczku httpOnly jest nieaktualny.
- Nie istnieje: refresh token, wylogowanie po stronie serwera, reset hasła, zmiana hasła, edycja profilu, usuwanie konta, weryfikacja e-maila.
- Zachowanie PWA: z zapisanym użytkownikiem apka otwiera się od razu, `/auth/me` jest sprawdzane w tle z limitem 6 s; wylogowuje tylko jawne 401/403, nigdy błąd sieci ani 5xx. `authFetch` ma limit 15 s i przy 401 czyści sesję.
- Rola admina (`isAdmin`): może tworzyć globalne ćwiczenia i plany wbudowane oraz edytować cudze ćwiczenia i plany wbudowane.

### 1.4 Model danych (Prisma)

`User`, `Exercise`, `ExercisePhoto`, `Workout`, `WorkoutItem`, `WorkoutSet`, `ExerciseUserStats`, `ExercisePendingNote`, `WorkoutPlan`, `WorkoutPlanItem`, `WorkoutPlanVersion`, `UserFavoritePlan`. Fakty istotne dla synchronizacji:

- Wszystkie klucze to UUID (`@default(uuid())`). Wyjątek historyczny: `creatorUserId = "1"` lub `null` oznacza ćwiczenie globalne.
- `Workout`, `WorkoutItem`, `WorkoutSet` mają już `clientId` z unikalnością w zakresie rodzica i deduplikacją przy tworzeniu. Ćwiczenia i plany tego nie mają.
- `updatedAt` mają: `Exercise`, `User`, `Workout`, `WorkoutPlan`, `WorkoutItem`, `WorkoutSet`, `ExercisePendingNote`, `ExerciseUserStats`. Nie mają: `WorkoutPlanItem`, `UserFavoritePlan`, `ExercisePhoto`, `WorkoutPlanVersion`. `User` nie ma `createdAt`.
- Nie ma miękkiego usuwania. Usunięcia są twarde i kaskadowe: usunięcie ćwiczenia usuwa wszystkie `WorkoutItem` z tym ćwiczeniem (czyli historię treningów), statystyki i pozycje planów.
- Jeden aktywny trening na użytkownika: `User.activeWorkoutId`. `POST /api/workouts` przy istniejącym aktywnym DRAFT zwraca ten istniejący zamiast tworzyć nowy.
- `WorkoutSet.weight` to `Decimal(6,2)`, w JSON przychodzi jako string.
- `WorkoutPlan` ma unikalność `(creatorUserId, name)`; plan publiczny może zawierać tylko ćwiczenia globalne.

### 1.5 API (stan obecny)

- Auth: jak w 1.3. `GET /api/users/:id` (właściciel lub admin).
- Ćwiczenia: `GET /api/exercises` (globalne + własne), `GET/PATCH/DELETE /api/exercises/:id`, `POST /api/exercises`.
- Treningi: `POST/GET /api/workouts`, `GET/PATCH/DELETE /api/workouts/:id`, `GET/DELETE /api/workouts/active`, `POST /api/workouts/:workoutId/exercises`, `PATCH/DELETE /api/workouts/items/:itemId`, `POST /api/workouts/items/:itemId/sets`, `PATCH/DELETE /api/workouts/sets/:setId`, `GET /api/workouts/:id/next-from-plan`, `POST /api/workouts/:id/skip-plan-exercise`.
- Statystyki: `GET /api/workouts/stats/all`, `/stats/overview`, `/stats/progression/:exerciseId`, `/stats/exercise/:exerciseId`.
- Plany: `GET /api/plans?tab=mine|builtin|community`, `GET/PUT/DELETE /api/plans/:id`, `POST /api/plans`, `GET /api/plans/:id/history`, `POST /api/plans/:id/duplicate`, `POST/DELETE /api/plans/:id/favorite`.
- Zdjęcia ćwiczeń: pliki statyczne pod `/uploads/...`, tylko do odczytu z poziomu PWA.
- Komunikaty błędów są mieszane: część po polsku, część po angielsku (plany, ćwiczenia). PWA pokazuje część z nich wprost.

### 1.6 Logika, która dziś żyje tylko na serwerze

Apka offline musi ją odtworzyć lokalnie, a synchronizacja musi ją nadal uruchamiać na serwerze:

- **Statystyki ćwiczenia** (`rebuildExerciseStatsFromCompletedWorkouts`): pełna przebudowa z zakończonych treningów po zakończeniu treningu, usunięciu treningu, zmianie serii, pozycji lub notatki w zakończonym treningu. Progresja sortowana po `workoutDate`, remisy po `createdAt`.
- **Podsumowanie** (`getStatsOverview`): treningi z ostatniego miesiąca i roku, łączna liczba serii, łączna objętość.
- **Przenoszenie notatek**: `ExercisePendingNote` zapisywana przy zmianie notatki i przy zakończeniu treningu; przy dodaniu ćwiczenia do treningu trafia do `previousNote` i jest usuwana.
- **Historia planu**: `WorkoutPlanVersion` zapisywana przy każdej zmianie planu.
- **Walidacje planów**: unikalność nazwy, wymóg globalnych ćwiczeń dla planu publicznego, nazwa kopii „(kopia)”, „(kopia 2)”.
- **Samonaprawa aktywnego treningu**: `GET /api/workouts/active` czyści wskaźnik, jeśli trening nie istnieje lub jest zakończony.

### 1.7 PWA: ekrany i nawigacja

Nie ma routera ani adresów URL. Nawigacją steruje stan w `useNavigation` i `AuthenticatedApp.tsx`.

- Zakładki: `trainings` (Treningi), `exercises` (Ćwiczenia), `stats` (Statystyki), `plans` (Plany), `menu` (Ustawienia). Dolny pasek ma trzy zakładki, przycisk „Nowy trening” (lub licznik „Kontynuuj trening”, gdy trening trwa) i przycisk szuflady. Szuflada boczna otwierana przyciskiem i gestem przeciągnięcia prowadzi do wszystkich pięciu zakładek.
- Ekrany podrzędne: `workout-detail`, `add-exercise`, `edit-exercise`, `stats-exercise-detail`, `plan-form`.
- Modale i arkusze: nowy trening (z wyborem planu z ulubionych i wbudowanych), szczegóły treningu, notatki treningu, wybór ćwiczenia, historia planu, wybór motywu, zdjęcie ćwiczenia, dialog porzuconego treningu.
- Banery globalne: brak połączenia, nieudana synchronizacja (Ponów / Zamknij), dostępna nowa wersja.
- Powroty zależne od pochodzenia: `add-exercise` wraca do treningu (i od razu dodaje nowe ćwiczenie), do formularza planu (z zachowanym szkicem) albo do listy ćwiczeń.
- Potwierdzenia i błędy w większości przez natywne `confirm()` i `alert()` przeglądarki.
- Logowanie i rejestracja to dwa ekrany przełączane stanem. Rejestracja: imię, nazwisko, e-mail, opcjonalny telefon, hasło i potwierdzenie.
- Ustawienia: karta profilu tylko do odczytu, wybór motywu, „Odśwież pamięć podręczną”, wylogowanie, stopka z wersją. Nic więcej.

### 1.8 PWA: logika po stronie klienta

- **Czas treningu** (`utils/workoutTimer.ts`): liczony od `workout.createdAt` do teraz. Trening jest „porzucony” po 2 godzinach bez aktywności (najnowszy `updatedAt` treningu, pozycji lub serii); wtedy czas jest obcinany do ostatniej aktywności, a po starcie apki pojawia się dialog „Kontynuuj / Zakończ trening”. Przy zakończeniu klient wysyła `durationSeconds`.
- **Poprzednie serie** (`utils/previousSets.ts`): podpowiedź ostatnio użytych ciężarów z dowolnego innego treningu, także niezakończonego.
- **Szkic serii**: po dodaniu ćwiczenia otwiera się niezapisany wiersz z ciężarem i powtórzeniami z poprzedniej sesji; seria powstaje dopiero po potwierdzeniu. Walidacja: ciężar ≥ 0 (krok 0,5), powtórzenia ≥ 1.
- **Zakończenie treningu**: wymaga co najmniej jednego ćwiczenia i co najmniej jednej serii w każdym ćwiczeniu.
- **Następne ćwiczenie z planu**: liczone lokalnie z planu, dodanych i pominiętych ćwiczeń.
- **Wyszukiwanie** (`utils/fuzzyMatch.ts`): rozmyte, z normalizacją polskich znaków. Filtry ćwiczeń: grupa mięśniowa, wykonywane, ze zdjęciem, własne; sortowanie po nazwie.
- **Statystyki**: lista rekordów i aktualnych obciążeń ze `stats[]`, podsumowanie z `/stats/overview`, wykres progresji (własny komponent SVG) z `/stats/progression`, buforowany offline.
- **Historia planu**: różnice między wersjami liczone w `features/plans/planHistory.ts`.
- **Kolejność w planie**: przeciąganie (`@dnd-kit`).

### 1.9 PWA: obecny offline i jego ograniczenia

IndexedDB (`utils/localStore.ts`) + kolejka operacji (`utils/syncManager.ts`), synchronizacja co 2 minuty i po powrocie sieci, optymistyczne aktualizacje z wycofaniem.

- Identyfikatory tymczasowe `temp_*` mapowane na prawdziwe po odpowiedzi serwera; operacje zależne czekają na mapowanie.
- Operacja po 3 nieudanych próbach jest oznaczana jako trwale nieudana i ląduje w banerze.
- Po wysłaniu kolejki klient pobiera wszystko od nowa i nadpisuje lokalną bazę.
- Plany: tworzenie, edycja, usuwanie, duplikowanie, ulubione i historia wymagają sieci.
- Trening utworzony offline dostaje na serwerze `createdAt` z chwili synchronizacji, więc licznik czasu przeskakuje.
- Statystyki i progresja offline to tylko ostatnia pobrana kopia.
- Wylogowanie czyści lokalne treningi, statystyki i kolejkę oczekujących zmian.

### 1.10 System wizualny

- Tokeny jako zmienne CSS `--gg-*` w `frontend/src/index.css`: tło, trzy poziomy powierzchni, trzy obramowania, trzy kolory tekstu, akcenty `a1`/`a2`, przyciski, tagi, rekordy, pasek nawigacji, cienie, kolory aktywnego treningu (bursztyn), błąd.
- **12 motywów, nie jeden ciemny:** ciemne `dark`, `steel`, `graphite`, `violet`, `ember`, `crimson`; jasne `light`, `blossom`, `sky`, `sand`, `sage`, `slate`. Wybór zapisywany lokalnie (`hooks/useTheme.ts`).
- Fonty: Barlow (400–900), Barlow Condensed (600–900), DM Sans (400–700, kursywa 400), hostowane lokalnie przez `@fontsource`.
- Ikony: ręcznie pisane SVG w kodzie komponentów, bez biblioteki ikon.
- Style: mieszanka klas Tailwind i stylów inline z wartościami w pikselach. Efekty wymagające natywnego odpowiednika: `backdrop-filter: blur`, gradient przycisku, `color-mix` dla poświaty, animacja wejścia ekranu (0,2 s, przesunięcie 8 px), obsługa `prefers-reduced-motion`.
- Język: wyłącznie polski, teksty wpisane w komponenty, daty w formacie `pl-PL`. Brak i18n.

### 1.11 Zastane błędy i długi (nie przenosić, odnotować)

- `GET /api/exercises` i `GET /api/exercises/:id` dołączają `creator: true`, czyli cały wiersz użytkownika łącznie z hashem hasła. Do naprawy niezależnie od migracji (zmiana zgodna wstecznie: zwracać tylko `id`, imię, nazwisko, e-mail).
- `updateWorkoutSet` wykonuje pusty `update` przed sprawdzeniem uprawnień: podbija `updatedAt` cudzej serii i zwraca 500 zamiast 404 dla nieistniejącej.
- `CLAUDE.md` wspomina `other/GymGate_API.postman_collection.json`, którego nie ma w repo.
- Typ `MuscleGroup` we frontendzie zawiera `LEGS`, którego nie ma w enumie bazy.
- Szablon `frontend/.env.example` zawiera nieużywane zmienne.

---

## 2. Cel

Natywna aplikacja na iOS i Androida, która robi to samo co obecne PWA (sekcja 1.7–1.8), wygląda tak samo (sekcja 1.10, wszystkie 12 motywów), a dodatkowo ma w pełni lokalny tryb offline z niezawodną synchronizacją oraz Live Activity / stałe powiadomienie dla aktywnego treningu.

## 3. Ustalenia, których nie zmieniasz

1. **Technologia:** Expo (React Native) + TypeScript strict. Wersje i biblioteki dobierasz po sprawdzeniu aktualnej dokumentacji, nie z pamięci.
2. **Repo:** nowy folder `mobile/` obok `backend/` i `frontend/`, z własnym `package.json` i lockfile (npm). Bez workspace'ów i bez przenoszenia istniejących folderów. Dodajesz `.github/workflows/mobile-ci.yml` z filtrem ścieżek jak w istniejących workflow.
3. **Backend zostaje jako API.** Zmiany wyłącznie addytywne: nowe endpointy, nowe opcjonalne pola, nowe tabele i kolumny z wartościami domyślnymi. Istniejące endpointy zachowują kształt odpowiedzi i zachowanie. Jedyne dopuszczalne zmiany w istniejących ścieżkach: dopisanie zapisu do dziennika usunięć (sekcja 6.3) i naprawy błędów z 1.11, każda z testem.
4. **`frontend/` jest tylko do czytania.** Nie edytujesz go.
5. **Parytet 1:1** z sekcjami 1.7–1.8: każdy ekran, modal, walidacja, komunikat, filtr, sortowanie i przypadek brzegowy. Istniejące konta i dane działają od razu. Uprawnienia admina (globalne ćwiczenia, plany wbudowane) też są w zakresie.
6. **Wygląd:** te same tokeny, układ, odstępy, typografia (Barlow, Barlow Condensed, DM Sans jako pliki fontów w apce), ikony (te same ścieżki SVG) i wszystkie 12 motywów. Dopuszczalne różnice: systemowy rendering tekstu i cieni. Natywne ma być zachowanie telefonu: przejścia między ekranami, gest cofania, klawiatura, safe area, haptyka, przewijanie. `confirm()`/`alert()` z PWA stają się natywnymi alertami z tymi samymi tekstami.
7. **Nawigacja:** PWA nie ma routera, więc mapę ekranów projektujesz w `PLAN.md`: zakładki i szuflada jak w PWA, ekrany podrzędne na natywnym stosie, modale jako natywne arkusze. Powroty zależne od pochodzenia (1.7) muszą działać identycznie.
8. **Offline-first** według sekcji 6. Mechanizmu z PWA (`temp_*`, kolejka endpointów, pełne nadpisywanie) nie przenosisz.
9. **Live Activity / powiadomienie** według sekcji 7.
10. **Poza zakresem:** zdalne push, aparat i galeria, wgrywanie zdjęć ćwiczeń, edycja profilu, reset hasła, i18n, jakiekolwiek funkcje spoza PWA poza wyjątkami D3–D5.
11. **Sprzęt właściciela:** MacBook Pro M4, iPhone 15 Pro, starszy Xiaomi z Androidem. Kont Apple Developer i Google Play jeszcze nie ma. Do tego czasu: symulator, emulator i fizyczny iPhone wgrywany z Xcode na darmowym Apple ID.

## 4. Ciągłość działania: zasada nadrzędna

Właściciel regularnie trenuje z PWA na produkcji. Przez całą migrację musi ona działać bez przerw i bez utraty danych. Ta zasada wygrywa z każdą inną.

- **Baza.** Przed jakimkolwiek poleceniem dotykającym bazy sprawdzasz, że celem jest `localhost:5433/gymgate_local`. Backend uruchamiasz wyłącznie z `DB_ENV=local`. Migracje tworzysz i stosujesz wyłącznie z jawnie podstawionym lokalnym `DATABASE_URL` i `DIRECT_URL` (jak cele `make local-*`). Nigdy nie uruchamiasz `make migrate`, `make migrate-dev`, `make migrate-reset` ani gołego `npx prisma migrate ...`. Jeśli `backend/.env` zawiera produkcyjny adres, nie zmieniasz go, tylko nadpisujesz zmienne w poleceniu.
- **Backup.** Zgodnie z `CLAUDE.md`, przed każdą migracją także lokalnie: `npm run --prefix backend backup:sql` i sprawdzenie pliku w `backend/backups/`.
- **Deploy.** Żadnego deployu, żadnych zmian w Railway, Vercel, Supabase, domenach ani zmiennych środowiskowych. Nie pushujesz do `main` ani `dev` i nie otwierasz PR do `main` bez polecenia właściciela.
- **Etap 0 ustala** (i zapisuje w `STATUS.md`): z jakiej gałęzi deployuje Railway, czy Vercel buduje podglądy z gałęzi roboczych i na jakie API wskazują, czy cokolwiek poza `main` ma dostęp do produkcyjnej bazy. Czego nie da się sprawdzić z repo, trafia do `DLA_MATEUSZA.md` jako pytanie, a do czasu odpowiedzi zakładasz wariant ostrożny.
- **Merge backendu = migracja produkcji** (1.2). Dlatego każda zmiana backendu ma wpis w `mobile/docs/WDROZENIE_BACKENDU.md`: kolejność, backup produkcyjnej bazy przed mergem, test PWA po wdrożeniu, sposób wycofania (w tym SQL cofający migrację).
- **Migracje:** tylko nowe tabele i nowe kolumny z wartościami domyślnymi lub nullable. Bez usuwania, zmiany nazw i typów. Stary kod backendu musi działać na nowym schemacie, a nowy kod na starym kliencie.
- **Test PWA po każdej zmianie backendu:** PWA lokalnie na zmienionym backendzie i lokalnej bazie, pełna ścieżka: logowanie, nowy trening z planu, dodanie ćwiczenia, zapis i edycja serii, notatka, pominięcie ćwiczenia z planu, zakończenie, historia, statystyki, edycja planu, tryb offline i powrót sieci. Automatyzujesz to w Playwright (poza `frontend/`, np. `mobile/tools/pwa-smoke/`).
- **Okres przejściowy:** PWA i apka działają równolegle na tym samym koncie. Trening z jednej jest widoczny w drugiej bez duplikatów i nadpisań. PWA nadal pobiera całość przez stare endpointy, więc wszystko, co apka zapisze, musi być poprawnie widoczne przez stare API.

## 5. Tryb pracy

- Pracujesz samodzielnie, bez pytań, z wyjątkiem trzech punktów kontrolnych z D2. Na punkcie kontrolnym aktualizujesz `STATUS.md`, opisujesz, co jest do przejrzenia, i kończysz sesję.
- Niejednoznaczności rozstrzygasz na korzyść zachowania PWA i zapisujesz w `mobile/docs/DECYZJE.md` z uzasadnieniem.
- Stan pracy trzymasz w plikach. `mobile/docs/STATUS.md` aktualizujesz po każdym kroku: zrobione, w trakcie, następne, znane problemy.
- Gałąź: `mobile-migration`, utworzona z `dev`. Regularnie wciągasz zmiany z `dev`; po każdym takim wciągnięciu sprawdzasz, czy PWA zyskało nowe funkcje, i dopisujesz je do `INWENTARYZACJA.md` i `PARYTET.md`.
- Małe commity z opisowymi komunikatami; przerwana sesja nie zostawia repo w stanie niebudowalnym.
- **Gdzie uruchamiać.** Etapy 0–2, zmiany backendu i czysta logika TypeScript mogą powstawać w sesji chmurowej. Wszystko, co wymaga symulatora iOS, Xcode lub emulatora Androida (od Etapu 3), wymaga sesji lokalnej na MacBooku. W sesji bez symulatora nie oznaczasz niczego jako zweryfikowane na urządzeniu.
- Czego nie zrobisz sam (test na telefonie, konto, sekret, ustawienie w panelu hostingu), dopisujesz do `mobile/docs/DLA_MATEUSZA.md` jako instrukcję krok po kroku i idziesz dalej.
- Sekrety: nigdy nie commitujesz kluczy, haseł ani `.env`. Dodajesz `.env.example`.
- Nie przechodzisz do kolejnego etapu, dopóki bieżący nie spełnia definicji ukończenia (sekcja 9).

## 6. Offline i synchronizacja

Na siłowni często nie ma zasięgu. Apka ma być w pełni używalna bez internetu i nie może zgubić żadnych danych.

### 6.1 Zasady

- Lokalna baza SQLite jest źródłem prawdy dla interfejsu. Ekrany czytają i zapisują lokalnie; sieć służy tylko do synchronizacji w tle.
- Offline działa wszystko poza pierwszym logowaniem i rejestracją, w tym plany (D3) i statystyki liczone lokalnie.
- Identyfikatory generowane na telefonie jako UUID. Serwer przyjmuje je jako klucz główny rekordu (nowa ścieżka synchronizacji), więc nie ma mapowania identyfikatorów.
- Kolejka zmian (outbox) w tej samej transakcji co zapis danych. Wysyłka w kolejności, z ponawianiem i rosnącymi odstępami, bez limitu trzech prób z PWA.
- Każda operacja ma własny identyfikator; serwer zapamiętuje przetworzone i przy powtórce zwraca ten sam wynik.
- Zabicie apki, crash lub restart w dowolnym momencie nie gubi danych ani trwającego treningu.
- Migracje lokalnej bazy wersjonowane.

### 6.2 Nowe API tylko dla apki

Osobna przestrzeń (np. `/api/sync/push` i `/api/sync/pull`), zbudowana w obecnych warstwach i **wywołująca istniejące serwisy**, żeby logika z 1.6 działała identycznie niezależnie od tego, który klient zapisał dane. Stare endpointy pozostają dla PWA bez zmian. Dokładny kształt projektujesz w `PLAN.md`; wymagania:

- `push`: paczka operacji, przetwarzana po kolei, wynik dla każdej operacji osobno (przyjęta, już przetworzona, odrzucona z kodem i komunikatem).
- `pull`: zmiany od podanego kursora, także usunięcia; pierwsze pobranie po zalogowaniu stronicowane.
- Kursor nie może gubić zmian zatwierdzonych równolegle (czyste porównanie `updatedAt` nie wystarcza; opisz rozwiązanie).
- Zakres danych użytkownika: własne treningi, statystyki, oczekujące notatki, ćwiczenia globalne i własne, plany własne, wbudowane i publiczne, ulubione, `activeWorkoutId`.

### 6.3 Usunięcia

Bez kolumny `deletedAt` w istniejących tabelach (wymagałaby filtra w każdym zapytaniu PWA). Zamiast tego nowa tabela dziennika usunięć, zapisywana w istniejących ścieżkach usuwania. Kaskady (trening → pozycje → serie, ćwiczenie → pozycje treningów, plan → pozycje) apka odtwarza lokalnie na podstawie usunięcia rodzica; opisz w `PLAN.md`, jak to jest spójne z kaskadami w bazie, w tym dla usunięć wykonanych przez PWA.

### 6.4 Znaczniki czasu

- Czas treningu i wykrywanie porzuconego treningu zależą od `createdAt` i `updatedAt` (1.8). Synchronizacja musi zapisywać czasy z telefonu (start treningu, czas każdej zmiany), a nie chwilę dotarcia paczki na serwer. Inaczej PWA pokaże błędny czas dla treningu z apki.
- Statystyki sortują po `workoutDate`, a remisy po `createdAt`; kolejność musi być taka sama lokalnie i na serwerze.
- Zegar telefonu może być przestawiony: opisz w `PLAN.md` zabezpieczenie (np. odrzucanie czasów z przyszłości).

### 6.5 Konflikty i odrzucenia

- Reguła domyślna: nowsza zmiana wygrywa na poziomie rekordu. Dane treningu zapisane na telefonie nie mogą zostać nadpisane starszym stanem z serwera.
- **Jeden aktywny trening.** Jeśli apka offline rozpocznie trening, a w PWA trwa już inny, serwer ma dziś regułę „zwróć istniejący”. Zdefiniuj w `PLAN.md` zachowanie, które nie gubi żadnej serii (domyślnie: oba treningi zostają, aktywny jest nowszy, starszy pozostaje jako DRAFT do ręcznego zakończenia).
- **Odrzucenia po czasie.** Zmiany zrobione offline mogą zostać odrzucone: nazwa planu zajęta, plan publiczny z prywatnym ćwiczeniem, rekord usunięty na innym urządzeniu, brak uprawnień. Każde odrzucenie jest widoczne dla użytkownika z możliwością poprawienia lub porzucenia zmiany; nie blokuje reszty kolejki; nie znika po cichu. Walidacje z 1.6 wykonujesz też lokalnie, żeby odrzucenia były rzadkie.
- **Usunięcie ćwiczenia** kasuje kaskadowo historię treningów z tym ćwiczeniem. Apka pokazuje to samo potwierdzenie co PWA; opisz, co się dzieje, gdy w kolejce są serie do ćwiczenia usuniętego na innym urządzeniu.
- Statystyki z serwera są pochodną: po synchronizacji wynik serwera zastępuje lokalnie policzony, a test porównuje oba dla tych samych danych.

### 6.6 Sesja

- Token w magazynie systemowym (Keychain / Keystore), nie w zwykłym storage.
- Refresh token (D5): nowe endpointy i nowa tabela, obecne `login`/`register` zwracają to samo co dziś plus opcjonalne nowe pole albo apka używa osobnych endpointów. PWA nie zauważa różnicy.
- Brak sieci nigdy nie wylogowuje. Wygasła sesja przy braku sieci: apka działa dalej na lokalnych danych, odświeża po powrocie sieci.
- Gdy odświeżenie jest niemożliwe (refresh token wygasł lub unieważniony): użytkownik loguje się ponownie, a lokalne dane i kolejka **zostają** i są wysyłane po zalogowaniu na to samo konto. Zalogowanie na inne konto przy niepustej kolejce wymaga jawnej decyzji użytkownika.
- Wylogowanie przy niepustej kolejce ostrzega, że niewysłane zmiany przepadną (PWA kasuje je po cichu; odnotuj odstępstwo).

### 6.7 Widoczny stan

- Baner offline z tekstem z PWA plus liczba oczekujących zmian.
- Odpowiednik „Odśwież pamięć podręczną”: pełne ponowne pobranie, dopiero po wysłaniu kolejki.
- Baner nowej wersji z PWA nie ma odpowiednika (aktualizacje przez sklep); odnotuj w `DECYZJE.md`.

### 6.8 Testy, które muszą istnieć i przechodzić

- cały trening w trybie samolotowym, powrót sieci, poprawna synchronizacja, trening widoczny w PWA z poprawnym czasem;
- zabicie apki w połowie treningu i wznowienie;
- utrata sieci w trakcie wysyłki i ponowienie bez duplikatów;
- ta sama paczka wysłana dwukrotnie;
- edycja tego samego rekordu w apce i w PWA;
- trening rozpoczęty offline w apce przy aktywnym treningu w PWA;
- długi okres offline z wieloma zmianami w kolejce;
- wygaśnięcie sesji w trakcie pracy offline i ponowne logowanie z niepustą kolejką;
- zmiana planu offline odrzucona przez serwer;
- usunięcie w PWA rekordu, do którego apka ma zmiany w kolejce;
- statystyki lokalne identyczne z serwerowymi dla tych samych danych (zestaw danych z `prisma/seed-local.ts`).

Testy synchronizacji po stronie backendu wymagają prawdziwej bazy (obecne testy mockują repozytoria): dodajesz zestaw integracyjny na lokalnym PostgreSQL, uruchamiany osobnym poleceniem, żeby nie zmieniać istniejącego `npm test` i CI.

## 7. Live Activity (iOS) i powiadomienie (Android)

- **Zakres informacji (D1):** czas treningu, nazwa treningu, bieżące ćwiczenie, liczba zapisanych serii w tym ćwiczeniu, ostatnia seria. Bez odliczania przerwy.
- **Czas treningu** renderowany przez system od znacznika startu, żeby tykał bez działającej apki. Uwaga na regułę porzuconego treningu (2 h bez aktywności): opisz, co wtedy pokazuje Live Activity i kiedy się kończy.
- **iOS:** start przy rozpoczęciu treningu, aktualizacja przy każdej zmianie, koniec przy zakończeniu lub usunięciu. Ekran blokady i Dynamic Island. Aktualizacje lokalne, bez zdalnych pushy. Kolory z aktywnego motywu, z rozsądnym zachowaniem dla motywów jasnych.
- Wymaga natywnego rozszerzenia (Swift / WidgetKit) i development builda. Sposób integracji z Expo wybierasz po sprawdzeniu aktualnej dokumentacji.
- Na początku etapu sprawdzasz, czy Live Activity działa na fizycznym iPhonie z darmowym Apple ID. Jeśli nie, budujesz i testujesz na symulatorze, a test na urządzeniu trafia do `DLA_MATEUSZA.md`.
- **Android:** stałe powiadomienie na czas treningu z tym samym zakresem i licznikiem czasu, działające przy zablokowanym ekranie i apce w tle. Uwzględnij oszczędzanie baterii na Xiaomi (MIUI / HyperOS) i opisz potrzebne ustawienia w `DLA_MATEUSZA.md`.
- Trening zakończony lub usunięty w PWA, gdy apka jest w tle: Live Activity i powiadomienie znikają przy najbliższej synchronizacji; opisz ograniczenie.

## 8. Etapy

### Etap 0: rozpoznanie i środowisko

- Zweryfikuj sekcję 1 z kodem; rozbieżności popraw w tym pliku.
- Ustal fakty z sekcji 4 o deployu i podglądach.
- Postaw lokalne środowisko: `make -C backend local-setup`, backend z `DB_ENV=local`, PWA z `VITE_API_URL=http://localhost:3000`. Dane testowe z `seed-local.ts`.
- Uruchom `make check` i zapisz stan wyjściowy testów backendu i frontendu.
- Utwórz gałąź `mobile-migration` z `dev` i `mobile/docs/STATUS.md`.

### Etap 1: pełna inwentaryzacja

Przeczytaj cały kod `frontend/src` i `backend/src`, plik po pliku. Sekcja 1 to szkielet, nie zastępstwo. Wynik w `mobile/docs/INWENTARYZACJA.md`:

- każdy ekran, modal i baner osobno: co wyświetla, wszystkie akcje, stany (ładowanie, pusty, błąd, offline), formularze z walidacją i dokładnymi tekstami, filtry, sortowanie;
- mapa przejść, w tym powroty zależne od pochodzenia i zachowanie przy zniknięciu otwartego treningu;
- różnice widoku dla admina;
- każdy endpoint: metoda, parametry, kształt odpowiedzi, kody i teksty błędów, miejsca użycia;
- cała logika klienta z 1.8 z dokładnymi regułami i przypadkami brzegowymi z testów (`*.test.ts(x)`);
- tokeny wszystkich 12 motywów, typografia, promienie, cienie, animacje, wymiary w pikselach z stylów inline;
- wszystkie teksty interfejsu;
- zachowania zależne od przeglądarki (service worker, manifest, `overscroll`, blokada przewijania pod modalem, `navigator.onLine`) i ich natywne odpowiedniki;
- zastane błędy (1.11 plus nowe znaleziska).

Na tej podstawie `mobile/docs/PARYTET.md`: lista kontrolna, każda funkcja i każdy stan każdego ekranu jako osobna pozycja.

Zrzuty każdego ekranu i stanu PWA w widoku iPhone'a 15 Pro (Playwright) w `mobile/docs/wzorzec/`: komplet w motywie `dark` i `light`, oraz ekran treningu i lista treningów we wszystkich 12 motywach.

### Etap 2: szczegółowy plan → punkt kontrolny

`mobile/docs/PLAN.md`: architektura, struktura folderów, biblioteki z uzasadnieniem, mapa nawigacji, schemat lokalnej bazy, pełny projekt synchronizacji (6.2–6.6) z listą migracji i endpointów, strategia testów, rozbicie etapów na małe zadania z kryteriami. **Zatrzymaj się na przegląd właściciela.**

### Etap 3: fundament (sesja lokalna na Macu)

Projekt Expo w `mobile/`, TypeScript strict, linter, nawigacja oparta na plikach, system motywów z 12 paletami, fonty, bazowe komponenty odpowiadające `frontend/src/components/ui` (Button, FormField, Modal, Switch, FilterChip, EmptyState, ScreenHeader, ScreenContainer), ikony z tych samych ścieżek SVG, klient API, konfiguracja środowisk, magazyn systemowy na token, testy jednostkowe i E2E, development build na iOS i Androida, `mobile-ci.yml`.

Przenieś z frontendu wraz z testami: typy (`types/`), `workoutTimer`, `previousSets`, `fuzzyMatch`, `formatters`, `planDraft`, `planHistory`, `constants/muscleGroups`. Kopiujesz, nie importujesz z `frontend/`.

### Etap 4: backend pod synchronizację

Migracje addytywne, dziennik usunięć, endpointy synchronizacji, przyjmowanie identyfikatorów i czasów z klienta, refresh token, testy integracyjne, aktualizacja `API.md` i `openapi.yaml`, wpis w `WDROZENIE_BACKENDU.md`, test PWA z sekcji 4. Przy okazji naprawa wycieku z 1.11.

### Etap 5: pionowy wycinek → punkt kontrolny

Lokalna baza, outbox i silnik synchronizacji oraz minimalna ścieżka: logowanie, pobranie danych, lista treningów, nowy trening, dodanie ćwiczenia, zapis serii, zakończenie, całość offline z późniejszą synchronizacją. Wgrane na iPhone'a właściciela (instrukcja w `DLA_MATEUSZA.md`). **Zatrzymaj się na test właściciela na siłowni.**

### Etap 6: logowanie, rejestracja, sesja

Pełny parytet ekranów z 1.7, zachowanie sesji z 6.6, komunikaty rate limitu.

### Etap 7: ćwiczenia

Lista z wyszukiwaniem i filtrami, dodawanie, edycja, usuwanie, zdjęcia (podgląd z `/uploads`, z pamięcią podręczną do pracy offline), widok admina.

### Etap 8: plany

Zakładki, ulubione, wyszukiwanie, sortowanie, formularz z przeciąganiem kolejności, duplikowanie, historia zmian, reguły publiczności, obsługa odrzuceń (6.5).

### Etap 9: trening

Najtrudniejszy ekran. Lista treningów z sortowaniem, trening aktywny i zakończony, tryb edycji zakończonego, szkic serii z podpowiedzią, notatki i notatka poprzednia, następne ćwiczenie z planu i pomijanie, edycja szczegółów, usuwanie, reguły zakończenia, dialog porzuconego treningu, licznik w dolnym pasku. Czas liczony ze znaczników, poprawny po zablokowaniu ekranu, przejściu w tło i zabiciu apki.

### Etap 10: statystyki

Podsumowanie, rekordy i aktualne obciążenia, szczegóły ćwiczenia, wykres progresji. Obliczenia lokalne, identyczne z serwerowymi (testy porównujące).

### Etap 11: ustawienia

Karta profilu, wybór motywu, odświeżenie danych, wylogowanie, stopka z wersją. Dodatkowo usuwanie konta (D4): endpoint, potwierdzenie hasłem, wpis w `DECYZJE.md`.

### Etap 12: Live Activity i powiadomienie

Według sekcji 7.

### Etap 13: natywne wykończenie

Przejścia, gesty (w tym szuflada), klawiatura numeryczna dla ciężaru i powtórzeń, safe area, haptyka, wydajność list, czas startu, dostępność (czytniki ekranu, rozmiar czcionki systemowej, ograniczenie ruchu), ikona i splash z `other/logo`, małe ekrany.

### Etap 14: końcowy audyt parytetu

Wciągnij `dev`, uzupełnij inwentaryzację o funkcje dodane do PWA w trakcie migracji. Przejdź `PARYTET.md` od zera, jakbyś oceniał cudzą pracę. Napraw każdą różnicę.

### Etap 15: przygotowanie do publikacji (bez publikacji)

Buildy produkcyjne, identyfikatory, wersjonowanie, opisy uprawnień, lista materiałów do sklepów, polityka prywatności, deklaracje danych, `mobile/docs/PUBLIKACJA.md` z planem wyłączenia PWA (w tym co zrobić z `ALLOWED_ORIGINS`, starymi endpointami i service workerem u użytkowników).

## 9. Definicja ukończenia etapu

1. Sprawdzanie typów, linter i wszystkie testy przechodzą (mobile oraz backend, jeśli był zmieniany; `make check` dla backendu i frontendu bez nowych błędów względem stanu z Etapu 0).
2. Nowa logika ma testy jednostkowe; przeniesiona logika przechodzi przeniesione testy.
3. Apka buduje się i uruchamia na symulatorze iOS i emulatorze Androida, a dany obszar został tam faktycznie przeklikany.
4. Testy E2E (np. Maestro) pokrywają główne ścieżki etapu na obu platformach.
5. Zrzuty z symulatora porównane ze wzorcem dla każdego ekranu i stanu; różnice w układzie, kolorach, odstępach i tekstach poprawione.
6. Pozycje w `PARYTET.md` odhaczone, każda z notatką o sposobie weryfikacji.
7. Przegląd własnego diffu z etapu świeżym okiem i poprawione znaleziska.
8. Jeśli zmieniano backend: test PWA z sekcji 4 przeszedł, `API.md` i `openapi.yaml` zaktualizowane, `WDROZENIE_BACKENDU.md` uzupełnione.
9. `STATUS.md` zaktualizowany.

Zasady uczciwości:

- Nie oznaczasz niczego jako zrobione bez sprawdzenia. Czego nie da się zweryfikować bez fizycznego urządzenia lub symulatora, oznaczasz jako „niezweryfikowane na urządzeniu” z dokładnym scenariuszem w `DLA_MATEUSZA.md`.
- Nie wyłączasz, nie pomijasz i nie osłabiasz testów. Nie uciszasz błędów typów.
- Gdy test nie przechodzi, szukasz przyczyny, a nie obejścia.

## 10. Pliki, które prowadzisz

| Plik | Zawartość |
|---|---|
| `mobile/docs/STATUS.md` | Stan: zrobione, w trakcie, następne, znane problemy, ustalenia o deployu |
| `mobile/docs/INWENTARYZACJA.md` | Pełny opis obecnej aplikacji |
| `mobile/docs/PARYTET.md` | Lista kontrolna funkcji ze sposobem weryfikacji |
| `mobile/docs/PLAN.md` | Architektura, projekt synchronizacji, szczegółowe zadania |
| `mobile/docs/DECYZJE.md` | Samodzielne decyzje i odstępstwa od PWA z uzasadnieniem |
| `mobile/docs/DLA_MATEUSZA.md` | Rzeczy wymagające właściciela: testy na telefonie, konta, sekrety, pytania o hosting |
| `mobile/docs/WDROZENIE_BACKENDU.md` | Bezpieczne wdrożenie zmian backendu i sposób ich wycofania |
| `mobile/docs/PUBLIKACJA.md` | Wydanie w sklepach i wyłączenie PWA |
| `mobile/docs/wzorzec/` | Zrzuty ekranu PWA do porównań |
| `mobile/README.md` | Jak uruchomić, zbudować i przetestować apkę |

## 11. Początek każdej sesji

1. Przeczytaj ten plik.
2. Przeczytaj `mobile/docs/STATUS.md` i `mobile/docs/PLAN.md` (jeśli istnieją).
3. Sprawdź, czy sesja ma symulator i Xcode; od tego zależy, które zadania wolno brać (sekcja 5).
4. Sprawdź stan gałęzi `mobile-migration`, czy repo się buduje i czy testy przechodzą; przerwaną pracę najpierw doprowadź do spójnego stanu.
5. Kontynuuj od pierwszego nieukończonego zadania.
6. Na koniec sesji zaktualizuj `STATUS.md` i zrób commit.
