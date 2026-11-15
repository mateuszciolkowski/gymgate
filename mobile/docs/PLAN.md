# Plan migracji: architektura, synchronizacja, zadania

Podstawa: `MIGRACJA_MOBILE.md` (zlecenie), `INWENTARYZACJA.md` (stan PWA), `PARYTET.md` (lista kontrolna). Uzasadnienia wyborów, które odbiegają od zlecenia lub PWA: `DECYZJE.md`.

Spis: 1. Biblioteki · 2. Struktura apki · 3. Nawigacja · 4. Lokalna baza · 5. Synchronizacja · 6. Zmiany w backendzie · 7. Sesja · 8. Statystyki lokalne · 9. Testy · 10. Zadania etapów 3–15 · 11. Środowisko testowe na VPS (opcja)

---

## 1. Biblioteki

Stan wiedzy z 2026-11-15 (sprawdzone w dokumentacji i ogłoszeniach Expo). Dokładne wersje ustala Etap 3 poleceniem `npx create-expo-app@latest` i `npx expo install`, które dobierają wersje zgodne z bieżącym SDK; wynik trafia do `mobile/README.md`.

| Obszar | Wybór | Uzasadnienie |
|---|---|---|
| Platforma | Expo, najnowszy stabilny SDK (w chwili planowania 56 lub nowszy; od SDK 55 wyłącznie Nowa Architektura) | Wymóg zlecenia; development build zamiast Expo Go |
| Nawigacja | `expo-router` (trasy z plików, natywny stos) | Wymóg zlecenia |
| Lokalna baza | `expo-sqlite` + Drizzle ORM (`drizzle-kit` do migracji, `useLiveQuery` do odświeżania ekranów) | Typowane zapytania, wersjonowane migracje, ten sam kod zapytań da się uruchomić w testach na `better-sqlite3` |
| Sekrety | `expo-secure-store` (Keychain / Keystore) | Wymóg zlecenia |
| Stan sieci | `@react-native-community/netinfo` plus faktyczny wynik ostatniej synchronizacji | `onLine` bywa prawdą bez dostępu do serwera |
| Stylowanie | `StyleSheet` + typowany obiekt motywu z `tokeny-motywow.json` w kontekście React | PWA używa zmiennych CSS i stylów inline w pikselach; mapowanie 1:1 bez dodatkowej warstwy. Bez NativeWind (decyzja D-07) |
| Fonty | Pliki Barlow, Barlow Condensed, DM Sans przez `expo-font` | Te same kroje i wagi co PWA |
| Ikony | `react-native-svg`, ścieżki skopiowane z PWA | Parytet ikon |
| Efekty | `expo-blur`, `expo-linear-gradient`, `expo-haptics` | Rozmycie paska i modali, gradient przycisku, haptyka |
| Animacje i gesty | `react-native-reanimated`, `react-native-gesture-handler` | Szuflada z progami z PWA, przeciąganie w planie |
| Listy | `@shopify/flash-list` | Długa historia treningów i lista ćwiczeń |
| Klawiatura | `react-native-keyboard-controller` | Pola serii nad klawiaturą, arkusze |
| Data i czas | `@react-native-community/datetimepicker` | Natywne selektory |
| Obrazy | `expo-image` z pamięcią dyskową | Zdjęcia ćwiczeń offline |
| Walidacja | `zod` | Te same reguły co backend |
| Testy jednostkowe | Jest (`jest-expo`) + React Native Testing Library; logika i warstwa danych także w Node | Standard Expo |
| Testy E2E | Maestro | Wskazane w zleceniu; działa na iOS i Androidzie |
| Live Activity | `expo-widgets` (pakiet Expo, stabilny od SDK 56) | `expo-live-activity` zarchiwizowane w czerwcu 2026; rozwiązanie pierwszej strony |
| Powiadomienie Android | Własny mały moduł Expo (Kotlin): usługa pierwszoplanowa + powiadomienie z chronometrem; na Androidzie 16+ jako Live Update | Notifee jest zarchiwizowane; do ponownej weryfikacji na starcie Etapu 12 (alternatywy: Voltra, `react-native-notify-kit`) |
| Powiadomienia lokalne | `expo-notifications` | Tylko jeśli okażą się potrzebne w Etapie 12; brak timera przerwy (D1) |

Do wyboru w etapie, w którym są potrzebne (po sprawdzeniu aktualnego stanu): biblioteka przeciągania w liście (Etap 8), arkusze dolne: natywna prezentacja `formSheet` routera albo `@gorhom/bottom-sheet` (Etap 3).

## 2. Struktura apki

```
mobile/
  app/                      trasy expo-router (tylko składanie ekranów)
  src/
    theme/                  tokeny 12 motywów, typografia, kontekst motywu
    ui/                     Button, FormField, Modal/Sheet, Switch, EmptyState, ikony
    features/
      auth/ workouts/ exercises/ plans/ stats/ settings/
        screens/ components/ (logika ekranu w hookach obok)
    domain/                 czysta logika bez React i bez bazy
      workoutTimer.ts previousSets.ts fuzzyMatch.ts formatters.ts
      planDraft.ts planHistory.ts planNext.ts stats.ts validation.ts muscleGroups.ts
    db/
      schema.ts             schemat Drizzle
      migrations/           wygenerowane migracje
      repositories/         zapytania i zapisy; każdy zapis = dane + wpis do outboxa w jednej transakcji
    sync/
      outbox.ts push.ts pull.ts engine.ts clock.ts issues.ts
    api/                    klient HTTP, typy kontraktu sync
    session/                tokeny, odświeżanie, stan zalogowania
    native/                 moduły natywne (Live Activity, powiadomienie Android)
  docs/  tools/  .maestro/
```

Zasady:

- Ekrany nie wołają sieci. Czytają przez zapytania na żywo i zapisują przez repozytoria.
- `domain/` nie importuje React ani bazy; ma komplet testów jednostkowych (w tym przeniesione z PWA).
- `db/` i `sync/` nie importują React; działają w Node na `better-sqlite3`, dzięki czemu protokół synchronizacji testujemy bez symulatora przeciwko lokalnemu backendowi.
- Brak globalnego magazynu danych w pamięci. Kontekst React tylko dla: sesji, motywu, stanu synchronizacji.

## 3. Nawigacja

PWA nie ma routera (INWENTARYZACJA 8.1), więc mapa jest projektem:

```
app/
  _layout.tsx                 dostawcy: motyw, sesja, baza, sync
  (auth)/login.tsx register.tsx
  (app)/
    _layout.tsx               Stack + pływający dolny pasek + szuflada + banery (nad stosem, widoczne na każdym ekranie jak w PWA)
    (tabs)/_layout.tsx        zakładki bez natywnego paska
      trainings.tsx exercises.tsx stats.tsx plans.tsx settings.tsx
    workout/[id].tsx
    exercise/new.tsx          parametr from=exercises|workout|plan
    exercise/[id]/edit.tsx
    stats/[exerciseId].tsx
    plan/new.tsx  plan/[id]/edit.tsx
    (arkusze)  workout-new  exercise-picker  workout-edit  workout-notes  plan-history  theme-picker  exercise-photo
```

- Dolny pasek i szuflada są własnymi komponentami (wygląd i progi gestu z PWA), renderowanymi w układzie `(app)`, żeby były widoczne także na ekranach podrzędnych.
- Gest szuflady od lewej krawędzi działa tylko na ekranach zakładek; na ekranach podrzędnych krawędź należy do systemowego gestu cofania (D-08).
- Powroty zależne od pochodzenia: `exercise/new` dostaje `from`; wynik (identyfikator nowego ćwiczenia) wraca przez mały magazyn „oczekującego wyniku”, który ekran treningu lub formularz planu odbiera po powrocie. Szkic planu żyje w magazynie modułu `plans` na czas edycji.
- Android: systemowy „wstecz” zamyka kolejno arkusz, szufladę, ekran podrzędny; na zakładce innej niż Treningi wraca do Treningów; na Treningach wychodzi z apki.
- Strażnik: brak sesji → `(auth)`; sesja → `(app)`. Pierwsze uruchomienie po zalogowaniu pokazuje ekran pobierania danych do czasu zakończenia pierwszej synchronizacji.

## 4. Lokalna baza

Jeden plik SQLite na konto (`gymgate-{userId}.db`), osobny mały magazyn ustawień urządzenia (motyw). Wylogowanie zamyka bazę; usuwa ją tylko wtedy, gdy outbox jest pusty albo użytkownik potwierdzi utratę zmian.

### 4.1 Tabele danych (odwzorowanie serwera, płaskie)

| Tabela | Kolumny (poza `id`) |
|---|---|
| `workouts` | `user_id`, `workout_date`, `status`, `workout_name`, `gym_name`, `location`, `workout_notes`, `duration_seconds`, `workout_plan_id`, `skipped_plan_exercise_ids` (JSON), `created_at`, `updated_at` |
| `workout_items` | `workout_id`, `exercise_id`, `order_in_workout`, `notes`, `previous_note`, `created_at`, `updated_at` |
| `workout_sets` | `item_id`, `set_number`, `weight` (TEXT, zapis dziesiętny jak na serwerze), `repetitions`, `created_at`, `updated_at` |
| `exercises` | `name`, `muscle_groups` (JSON), `description`, `creator_user_id`, `photos` (JSON), `created_at`, `updated_at` |
| `plans` | `name`, `short_name`, `creator_user_id`, `is_public`, `is_favorite`, `created_at`, `updated_at` |
| `plan_items` | `plan_id`, `exercise_id`, `order_in_plan` |
| `pending_notes` | `exercise_id` (unikalne), `note`, `updated_at` |
| `profile` | jeden wiersz: dane użytkownika, `is_admin`, `active_workout_id` |

Ciężar trzymamy jako tekst i liczymy na liczbach całkowitych w setnych kilograma, żeby wyniki zgadzały się z `Decimal(6,2)` serwera.

Statystyk nie przechowujemy: są liczone zapytaniami z lokalnych treningów (sekcja 8).

### 4.2 Tabele synchronizacji

| Tabela | Rola |
|---|---|
| `outbox` | `seq` (autoinkrement), `op_id` (UUID), `type`, `payload` (JSON), `entity`, `entity_id`, `created_at`, `attempts`, `last_error`, `state` (`pending` / `rejected`) |
| `sync_state` | kursor pobierania, znacznik zakończenia pierwszego pobrania, przesunięcie zegara względem serwera, czas ostatniej udanej synchronizacji |
| `sync_issues` | odrzucone operacje do pokazania użytkownikowi: opis, powód z serwera, stan rekordu na serwerze, status (`open` / `resolved`) |

### 4.3 Reguły zapisu

- Każda akcja użytkownika to jedna transakcja SQLite: zmiana danych, efekty pochodne (np. notatka oczekująca), wpis do `outbox`.
- Identyfikatory: UUID v4 generowane na urządzeniu.
- Znaczniki czasu: czas urządzenia skorygowany o zapamiętane przesunięcie względem serwera (`sync/clock.ts`).
- Kaskady lokalne odwzorowują kaskady serwera: trening → pozycje → serie; ćwiczenie → pozycje treningów (z seriami), pozycje planów, notatka oczekująca; plan → pozycje, a treningi tracą `workout_plan_id`.
- Migracje: generowane przez `drizzle-kit`, stosowane przy starcie apki przed pierwszym odczytem; test sprawdza przejście z każdej wcześniejszej wersji schematu na danych testowych.

## 5. Synchronizacja

### 5.1 Model

- Apka zapisuje lokalnie i dopisuje **operację domenową** do outboxa (np. „dodaj serię”), a nie różnicę wiersza. Serwer wykonuje operację przez te same reguły, których używa PWA, więc statystyki, przenoszenie notatek i historia planów działają identycznie niezależnie od klienta.
- Cykl synchronizacji: najpierw wysyłka (`push`), potem pobranie (`pull`). Wyzwalacze: start apki, powrót na pierwszy plan, odzyskanie sieci, 2 s po lokalnym zapisie (z łączeniem wywołań), co 2 minuty na pierwszym planie, ręcznie z Ustawień.
- Ponawianie po błędzie przejściowym: 5 s, 15 s, 60 s, potem co 5 minut; licznik zeruje się po odzyskaniu sieci, powrocie na pierwszy plan lub akcji użytkownika. Nie ma limitu prób dla błędów przejściowych.

### 5.2 Operacje

Każda ma `opId` (UUID), `type`, `at` (czas zmiany na urządzeniu, ISO) i dane:

| Typ | Dane |
|---|---|
| `workout.create` | `id`, `workoutDate`, `workoutName?`, `gymName?`, `workoutPlanId?`, `startedAt` |
| `workout.update` | `id`, zmienione pola spośród: `workoutDate`, `workoutName`, `gymName`, `workoutNotes`, `durationSeconds` |
| `workout.complete` | `id`, `durationSeconds` |
| `workout.delete` | `id` |
| `workout.skipPlanExercise` | `id`, `exerciseId` |
| `item.add` | `id`, `workoutId`, `exerciseId`, `orderInWorkout` |
| `item.update` | `id`, `notes` |
| `item.delete` | `id` |
| `set.add` | `id`, `itemId`, `setNumber`, `weight`, `repetitions` |
| `set.update` | `id`, `weight?`, `repetitions?` |
| `set.delete` | `id` |
| `exercise.create` | `id`, `name`, `muscleGroups`, `description?`, `isGlobal?` |
| `exercise.update` | `id`, zmienione pola |
| `exercise.delete` | `id` |
| `plan.create` | `id`, `name`, `shortName`, `exerciseIds`, `isPublic`, `isGlobal?` |
| `plan.update` | `id`, zmienione pola |
| `plan.delete` | `id` |
| `plan.duplicate` | `id` (nowego planu), `sourceId`, `name` (nazwa kopii wyliczona lokalnie) |
| `plan.favorite` / `plan.unfavorite` | `id` |

Wszystkie operacje są **naturalnie idempotentne**: utworzenie z istniejącym `id` zwraca sukces bez zmian, aktualizacja ustawia wartości bezwzględne, usunięcie nieistniejącego rekordu jest sukcesem. Tabela przetworzonych operacji (6.2) dodatkowo gwarantuje ten sam wynik przy powtórce.

### 5.3 Wysyłka: `POST /api/sync/push`

Żądanie: `{ deviceId, ops: [...] }`, do 100 operacji w kolejności `seq`. Odpowiedź: `{ serverTime, results: [{ opId, status, error?, current? }] }`.

| `status` | Znaczenie | Reakcja apki |
|---|---|---|
| `applied` | Wykonano | Usuwa operację z outboxa |
| `duplicate` | Już przetworzona wcześniej | Usuwa operację |
| `superseded` | Na serwerze jest nowsza zmiana tego rekordu (5.5) | Usuwa operację; wersja z serwera przyjdzie w `pull` |
| `rejected` | Trwałe odrzucenie: walidacja, brak uprawnień, rekord nie istnieje, konflikt nazwy | Oznacza operację jako odrzuconą, tworzy wpis w `sync_issues` z `error` i `current` (stan rekordu na serwerze albo `null`) |

- Serwer przetwarza operacje po kolei. Odrzucenie jednej nie przerywa pozostałych.
- Błąd przejściowy (sieć, 5xx, 429, przekroczenie czasu) dotyczy całego żądania: apka ponawia tę samą paczkę z tymi samymi `opId`.
- Odpowiedź 401 uruchamia odświeżenie sesji (sekcja 7), a paczka czeka.

### 5.4 Pobranie: `GET /api/sync/pull`

- **Bez kursora (pierwsze pobranie):** serwer zapamiętuje bieżący kursor przed odczytem, po czym zwraca dane stronami: ćwiczenia, plany, notatki oczekujące, profil, a treningi z pozycjami i seriami po 200 na stronę (`snapshotToken` do kolejnej strony). Zmiany, które zaszły w trakcie, przyjdą w pierwszym pobraniu przyrostowym.
- **Z kursorem:** `{ cursor, hasMore, upserts: { workouts, workoutItems, workoutSets, exercises, plans, pendingNotes, profile }, deletes: [{ entity, id }], serverTime }`, do 500 zmian na odpowiedź.
- Serwer prowadzi **dziennik zmian** (6.1): „rekord X typu Y zmienił się dla użytkownika Z (albo dla wszystkich)”. Przy pobraniu ustala **bieżący** stan każdego zmienionego rekordu z punktu widzenia pytającego: istnieje i jest widoczny → `upsert` z pełnym wierszem; w przeciwnym razie → `delete`. Dzięki temu zmiana widoczności (plan publiczny staje się prywatny) i usunięcie wyglądają dla klienta tak samo, a kolejność wpisów w dzienniku nie ma znaczenia.
- **Kursor nie gubi zmian zatwierdzonych równolegle:** każdy wpis dziennika zapisuje identyfikator transakcji; serwer zwraca tylko wpisy z transakcji starszych niż najstarsza wciąż trwająca (granica migawki PostgreSQL), a kursorem jest para (identyfikator transakcji, numer wpisu). Wpis z transakcji, która jeszcze trwa, zostanie zwrócony przy następnym pobraniu, nigdy pominięty.
- Dziennik jest czyszczony po 90 dniach. Kursor starszy niż najstarszy wpis → odpowiedź `resyncRequired`; apka wykonuje ponowne pełne pobranie, zachowując outbox.

Stosowanie pobranych danych na urządzeniu (jedna transakcja na odpowiedź):

1. Rekord, do którego w outboxie czeka operacja, jest pomijany: lokalna zmiana wygrywa do czasu wysłania.
2. Dane pochodne (`pending_notes`, `active_workout_id`) są przyjmowane tylko przy pustym outboxie.
3. Usunięcia stosują kaskady lokalne (4.3).
4. Kursor zapisuje się w tej samej transakcji co dane.

### 5.5 Konflikty

- **Reguła:** nowsza zmiana wygrywa na poziomie rekordu. Operacja aktualizująca niesie `at`; serwer wykonuje ją, gdy `at` ≥ `updatedAt` rekordu, w przeciwnym razie zwraca `superseded`. Zapis ustawia `updatedAt` = `at`.
- Usunięcie zawsze wygrywa z aktualizacją. Operacja na rekordzie usuniętym na serwerze jest odrzucana jako „nie istnieje”; apka usuwa rekord lokalnie przy pobraniu i pokazuje jedno zbiorcze powiadomienie (np. „Trening został usunięty na innym urządzeniu; 3 niewysłane zmiany pominięto”).
- **Zegar:** apka koryguje czas urządzenia o przesunięcie względem `serverTime` z ostatniej odpowiedzi. Serwer dodatkowo obcina `at` z przyszłości do swojego czasu. Czas startu treningu (`startedAt`) starszy niż 30 dni jest odrzucany jako błąd danych.
- **Jeden aktywny trening:** `workout.create` zawsze tworzy trening (nie zwraca istniejącego, jak stary endpoint). Aktywnym zostaje ten z późniejszym startem; drugi pozostaje szkicem widocznym w „Trening w toku” do ręcznego zakończenia lub usunięcia. Żadna seria nie ginie.
- **Numery serii i kolejność ćwiczeń** nadaje urządzenie (największy + 1). Równoległe dodanie w PWA i apce może dać ten sam numer; baza na to pozwala, a sortowanie rozstrzyga `createdAt`.
- **Odrzucenia planów** (nazwa zajęta, prywatne ćwiczenie w planie publicznym): plan zostaje lokalnie ze znacznikiem „wymaga poprawy”; z poziomu powiadomienia użytkownik otwiera formularz z powodem z serwera, poprawia i zapisuje (nowa operacja) albo przywraca wersję z serwera (`current`), albo usuwa plan. Te same walidacje działają lokalnie przed zapisem, więc odrzucenia są rzadkie.
- **Usunięcie ćwiczenia** usuwa lokalnie to samo, co serwer kaskadowo. Potwierdzenie w apce mówi wprost, ile treningów straci to ćwiczenie (rozszerzenie tekstu PWA, D-10).

### 5.6 Widoczny stan

- Baner offline (tekst z PWA) z liczbą oczekujących zmian.
- Baner odrzuceń w stylu banera błędu synchronizacji z PWA: opisy „{akcja} {obiekt}”, przyciski „Ponów” i „Zamknij”, plus wejście w szczegóły.
- Ustawienia: „Odśwież pamięć podręczną” najpierw wysyła outbox, potem wykonuje pełne pobranie; offline informuje, że odświeżenie nastąpi po powrocie sieci.

## 6. Zmiany w backendzie

Wszystko addytywne. Stare endpointy i ich odpowiedzi bez zmian. Nowy moduł `backend/src/modules/sync/` w obowiązujących warstwach.

### 6.1 Migracja M1: dziennik zmian

- Tabela `sync_changes`: `seq` (BIGSERIAL), `txid` (BIGINT, domyślnie identyfikator bieżącej transakcji), `scopeUserId` (TEXT, NULL = dla wszystkich), `entity`, `entityId`, `createdAt`; indeksy pod zapytanie pobierania.
- **Wyzwalacze PostgreSQL** (`AFTER INSERT/UPDATE/DELETE`) na tabelach: `workouts`, `workout_items`, `workout_sets`, `exercises`, `exercise_photos`, `workout_plans`, `workout_plan_items`, `user_favorite_plans`, `exercise_pending_notes`, `users` (tylko zmiana `activeWorkoutId` i danych profilu).
- Dlaczego wyzwalacze, a nie kod aplikacji: nie trzeba zmieniać żadnej istniejącej ścieżki zapisu, a dziennik obejmuje też zapisy PWA, kaskady, seedy i ręczny SQL. To spełnia zakaz ruszania zapytań PWA mocniej niż dopisywanie logowania w repozytoriach (D-03).
- Zasięg wpisu: trening i jego dzieci → właściciel treningu; ćwiczenie i plan → twórca, a gdy rekord jest globalny lub publiczny (albo właśnie przestał być) dodatkowo wpis „dla wszystkich”; zdjęcie ćwiczenia i pozycja planu → wpis dla rodzica; ulubione → wpis planu dla danego użytkownika.
- Dziecko usuwane kaskadowo po rodzicu, którego już nie ma, nie dostaje wpisu: apka odtwarza kaskadę z usunięcia rodzica.
- Wyzwalacz nie może przerwać zapisu PWA: funkcja jest prosta, bez zewnętrznych zależności, pokryta testami integracyjnymi dla każdej tabeli i operacji, w tym kaskad.
- Wycofanie: `DROP TRIGGER` dla każdej tabeli, `DROP FUNCTION`, `DROP TABLE sync_changes`. Bez wpływu na dane.

### 6.2 Migracja M2: przetworzone operacje

Tabela `sync_operations`: `opId` (klucz), `userId`, `deviceId`, `type`, `status`, `result` (JSON), `createdAt`. Czyszczona po 90 dniach. Wycofanie: `DROP TABLE`.

### 6.3 Migracja M3: sesje mobilne

Tabela `refresh_tokens`: `id`, `userId`, `tokenHash`, `deviceId`, `deviceName`, `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt`, `replacedById`. Wycofanie: `DROP TABLE` (apki tracą sesje, PWA bez wpływu).

### 6.4 Endpointy

| Endpoint | Rola |
|---|---|
| `POST /api/sync/push` | 5.3 |
| `GET /api/sync/pull` | 5.4 |
| `POST /api/auth/mobile/login`, `/register` | jak obecne, ale zwracają krótkotrwały token dostępu i token odświeżania |
| `POST /api/auth/mobile/refresh` | wymiana tokenu odświeżania (rotacja) |
| `POST /api/auth/mobile/logout` | unieważnienie tokenu odświeżania |
| `DELETE /api/auth/account` | usunięcie konta po potwierdzeniu hasłem (D4); dostępne także dla PWA, która go nie używa |

### 6.5 Zmiany w istniejącym kodzie (minimalne, każda z testem)

- `workout.service.ts`: eksport `rebuildExerciseStatsFromCompletedWorkouts` i `syncPendingNoteForExercise` do użycia przez moduł sync. Bez zmiany zachowania.
- Repozytoria: opcjonalne parametry `id`, `createdAt`, `updatedAt` w funkcjach tworzących i aktualizujących, używane tylko przez sync. Wywołania PWA nie przekazują ich i działają jak dotąd.
- Naprawy zastanych błędów zgodne wstecznie: B2 (hash hasła w `GET /api/exercises`: zwracamy tylko `id`, imię, nazwisko, e-mail), B8 (`updateWorkoutSet`: sprawdzenie uprawnień przed zapisem, 404 dla nieistniejącej serii).
- B1 (edycja szczegółów treningu w PWA) wymaga decyzji właściciela: naprawa po stronie backendu przez przyjęcie samej daty jest zgodna wstecznie i naprawia produkcję bez dotykania `frontend/`; domyślnie ją robimy (D-11).

### 6.6 Reguły modułu sync

- Każda operacja zaczyna transakcję od blokady wiersza użytkownika (`SELECT … FOR UPDATE`), tak jak obecne tworzenie treningu; zapobiega to zakleszczeniom i szereguje zapisy jednego konta.
- Uprawnienia i walidacje identyczne z istniejącymi serwisami (te same schematy Zod, te same komunikaty).
- Po operacjach zmieniających zakończony trening: przebudowa statystyk; po zmianie notatki i zakończeniu: notatki oczekujące; po zmianie planu: wersja w historii. Wszystko przez istniejące funkcje.
- Limit: 100 operacji na żądanie, 60 żądań na minutę na użytkownika.

## 7. Sesja

- Token dostępu: ten sam format JWT co dziś (istniejący `authMiddleware` bez zmian), ważny 1 godzinę. Token odświeżania: losowy, 180 dni, przesuwany przy każdym użyciu, przechowywany na serwerze jako skrót.
- Rotacja odporna na zgubioną odpowiedź: poprzedni token odświeżania pozostaje ważny, dopóki nowy nie zostanie użyty po raz pierwszy. Użycie tokenu starszego niż poprzedni unieważnia całą rodzinę (ochrona przed kradzieżą).
- Oba tokeny w `expo-secure-store`. Dane użytkownika w lokalnej bazie.
- Start apki: jest token odświeżania i lokalna baza → apka otwiera się od razu, bez sieci. Odświeżenie tokenu dostępu następuje leniwie przy pierwszej synchronizacji.
- 401 z API → jedna próba odświeżenia → ponowienie żądania. Odmowa odświeżenia (wygasł, unieważniony) → stan „wymagane ponowne logowanie”: apka działa dalej na danych lokalnych, pokazuje baner z przyciskiem logowania, outbox czeka. Brak sieci nigdy nie zmienia stanu sesji.
- Ponowne logowanie na to samo konto wznawia synchronizację. Logowanie na inne konto otwiera bazę tamtego konta; baza poprzedniego zostaje na urządzeniu z niewysłanymi zmianami i wraca przy ponownym zalogowaniu.
- Wylogowanie: przy pustym outboxie usuwa lokalną bazę konta i unieważnia token odświeżania; przy niepustym pyta, czy zachować dane na urządzeniu, czy je porzucić.
- Usunięcie konta: wymaga sieci i hasła; po sukcesie usuwa lokalną bazę i tokeny.

## 8. Statystyki lokalne

Apka nie pobiera statystyk z serwera: liczy je z lokalnych treningów tymi samymi regułami (D-05). Dzięki temu działają offline i reagują natychmiast.

| Wartość | Reguła (jak `workout.repository.ts`) |
|---|---|
| Progresja ćwiczenia | Dla każdego zakończonego treningu z ćwiczeniem: największy ciężar serii, powtórzenia przy pierwszej serii o tym ciężarze, objętość = suma ciężar × powtórzenia; kolejność po `workoutDate`, remisy po `createdAt` |
| Rekord | Punkt progresji z największym ciężarem (przy remisie najwcześniejszy) |
| Ostatnio | Ostatni punkt progresji |
| Liczba sesji | Liczba punktów progresji |
| Podsumowanie | Zakończone treningi z `workoutDate` w ostatnim miesiącu i roku kalendarzowym wstecz od teraz; liczba serii i objętość ze wszystkich zakończonych treningów |

Test parytetu: te same dane (`seed-local.ts` oraz zestaw brzegowy: remisy ciężaru, dwa treningi tego samego dnia, ciężar 0, ułamki) ładowane do lokalnego backendu i do lokalnej bazy apki; porównanie wyników endpointów `/stats/all`, `/stats/overview`, `/stats/progression` z wynikami `domain/stats.ts` pole po polu.

## 9. Testy

| Poziom | Zakres | Gdzie działa |
|---|---|---|
| Jednostkowe `domain/` | Logika przeniesiona z PWA z jej testami, statystyki, walidacje, odmiana tekstów | Node, CI |
| Warstwa danych | Repozytoria, kaskady, outbox w jednej transakcji, migracje | Node (`better-sqlite3`), CI |
| Protokół sync (klient ↔ prawdziwy backend) | Wszystkie scenariusze z sekcji 6.8 zlecenia, w tym dwie instancje klienta jako „dwa urządzenia” i stare endpointy w roli PWA | Node + lokalny PostgreSQL; osobne polecenie, lokalnie i w CI z usługą Postgres |
| Integracyjne backendu | Wyzwalacze (każda tabela, kaskady), `push` (idempotencja, konflikty, uprawnienia), `pull` (kursor przy równoległych transakcjach, widoczność), sesje, usuwanie konta | Lokalny PostgreSQL; `npm run test:integration`, poza obecnym `npm test` |
| Komponenty | Kluczowe komponenty z logiką (wiersz serii, karta ćwiczenia, formularz planu) | Jest + RNTL |
| E2E | Główne ścieżki każdego etapu na iOS i Androidzie, w tym tryb samolotowy i zabicie apki | Maestro, sesja na Macu |
| Regresja PWA | `mobile/tools/pwa-smoke/smoke.mjs` po każdej zmianie backendu; rozszerzany o plany, edycję treningu i offline | Playwright, lokalny backend |
| Wizualne | Zrzuty z symulatora obok `wzorzec/`, porównanie ekran po ekranie | Sesja na Macu |

Zasada: wszystko, co da się zweryfikować bez symulatora (logika, baza, protokół), ma testy uruchamiane w Node, żeby błędy synchronizacji wychodziły przed testami na urządzeniu.

## 10. Zadania etapów 3–15

Kryterium ukończenia każdego etapu: definicja z sekcji 9 zlecenia. Poniżej zadania i dodatkowe kryteria szczegółowe. „(chmura)” = wykonalne bez symulatora.

### Etap 3: fundament

- 3.1 Projekt Expo w `mobile/`, TypeScript strict, ESLint, Prettier, skrypty `typecheck`, `lint`, `test` (chmura: szkielet; Mac: pierwsze uruchomienie)
- 3.2 `domain/`: przeniesienie `workoutTimer`, `previousSets`, `fuzzyMatch`, `formatters`, `planDraft`, `planHistory`, `muscleGroups`, typów, wraz z testami z PWA (chmura)
- 3.3 Motywy: generator typowanego obiektu z `tokeny-motywow.json`, kontekst motywu, zapis wyboru (chmura: generator i testy)
- 3.4 Fonty i ikony (ścieżki SVG z PWA)
- 3.5 Komponenty bazowe: Button, FormField, pole tekstowe, Modal/Sheet, Switch, EmptyState, spinner, alerty
- 3.6 Szkielet nawigacji: trasy, pusty dolny pasek, szuflada z gestem
- 3.7 Klient API, konfiguracja środowisk (`.env.example`), bezpieczny magazyn
- 3.8 Development build iOS i Android; Maestro z testem „apka się uruchamia”
- 3.9 `mobile-ci.yml`: typy, lint, testy Node
- Kryterium: ekran logowania i pusta lista treningów wyglądają jak wzorzec w motywie `dark` i `light`.

### Etap 4: backend pod synchronizację (chmura)

- 4.1 Infrastruktura testów integracyjnych na lokalnym PostgreSQL (`test:integration`)
- 4.2 M1: `sync_changes` + wyzwalacze + testy każdej tabeli, operacji i kaskady
- 4.3 Eksport funkcji pochodnych i opcjonalne parametry `id`/czasów w repozytoriach + testy, że wywołania PWA działają bez zmian
- 4.4 M2 + `POST /api/sync/push`: wszystkie operacje z 5.2, statusy, idempotencja, reguła nowszej zmiany, polityka aktywnego treningu
- 4.5 `GET /api/sync/pull`: pierwsze pobranie stronami, pobranie przyrostowe, kursor odporny na równoległe transakcje, widoczność, `resyncRequired`
- 4.6 M3 + sesje mobilne (login, rejestracja, odświeżanie z rotacją, wylogowanie)
- 4.7 `DELETE /api/auth/account`
- 4.8 Naprawy B2, B8, B1 (D-11)
- 4.9 `API.md` modułów, `docs/api/openapi.yaml`, `mobile/docs/WDROZENIE_BACKENDU.md`
- 4.10 Regresja: `make check`, test dymny PWA, rozszerzenie testu dymnego o plany i edycję treningu
- Kryterium: stare endpointy dają bajt w bajt te same odpowiedzi co przed zmianami dla scenariusza testu dymnego (poza polem `creator` z naprawy B2).

### Etap 5: pionowy wycinek

- 5.1 Schemat Drizzle, migracje, repozytoria treningów, pozycji, serii, ćwiczeń (chmura)
- 5.2 Outbox, `push`, `pull`, silnik z ponawianiem, zegar (chmura)
- 5.3 Testy protokołu przeciwko lokalnemu backendowi: scenariusze z 6.8 zlecenia (chmura)
- 5.4 Sesja mobilna: logowanie, odświeżanie, stan „wymagane logowanie” (chmura: logika)
- 5.5 Ekrany minimalne: logowanie, pobieranie danych, lista treningów, nowy trening, ekran treningu z dodaniem ćwiczenia i serii, zakończenie
- 5.6 Maestro: trening w trybie samolotowym, zabicie apki, synchronizacja
- 5.7 Instrukcja wgrania na iPhone'a i połączenia z backendem na MacBooku w `DLA_MATEUSZA.md`
- Kryterium: trening zrobiony offline w apce jest po synchronizacji widoczny w lokalnym PWA z poprawnym czasem, a trening z PWA w apce.

### Etap 6: logowanie, rejestracja, sesja — PARYTET A

### Etap 7: ćwiczenia — PARYTET I

- Dodatkowo: pamięć podręczna zdjęć, widok admina.

### Etap 8: plany — PARYTET J

- Dodatkowo: przeciąganie kolejności, obsługa odrzuceń (5.5), historia z kopią offline (D-06).

### Etap 9: trening — PARYTET C, D, E, F, G, H

- Kolejność: lista → nowy trening → trening aktywny → karta ćwiczenia i serie → notatki → plan w treningu → trening zakończony i tryb edycji → modale → porzucony trening.

### Etap 10: statystyki — PARYTET K

- `domain/stats.ts` i test parytetu z backendem powstają już w Etapie 5 (chmura); tu ekrany i wykres.

### Etap 11: ustawienia i usuwanie konta — PARYTET L, M

### Etap 12: Live Activity i powiadomienie — PARYTET P

- 12.1 Weryfikacja aktualnego stanu `expo-widgets` i wyboru dla Androida
- 12.2 Sprawdzenie Live Activity na fizycznym iPhonie z darmowym Apple ID
- 12.3 iOS: aktywność z czasem od znacznika startu, nazwa, ćwiczenie, serie
- 12.4 Android: usługa pierwszoplanowa z chronometrem; ustawienia Xiaomi w `DLA_MATEUSZA.md`
- 12.5 Porzucony trening: po 2 h bez aktywności aktywność przechodzi w stan „Trening wstrzymany” z czasem do ostatniej aktywności; kończy się po zakończeniu treningu albo po systemowym limicie

### Etap 13: natywne wykończenie — PARYTET B, O

### Etap 14: końcowy audyt parytetu

### Etap 15: przygotowanie do publikacji

## 11. Środowisko testowe na VPS (opcja)

Decyzja D6 trzyma backend na gałęzi do końca, więc apka nie ma dostępu do prawdziwego konta. Właściciel ma VPS z Coolify; osobna instancja pozwala testować na telefonie poza domową siecią bez dotykania produkcji:

- osobna aplikacja Coolify z gałęzi `mobile-migration`, katalog `backend/`, własna baza PostgreSQL na VPS;
- dane: seed testowy albo jednorazowa kopia produkcji wykonana przez właściciela (kopia rozjedzie się z produkcją; treningi zrobione w apce na tej instancji nie trafią na prawdziwe konto);
- własny `JWT_SECRET`, `ALLOWED_ORIGINS` bez znaczenia dla apki natywnej;
- instrukcja krok po kroku trafi do `DLA_MATEUSZA.md` przy Etapie 5.

Decyzja należy do właściciela; plan jej nie wymaga.
