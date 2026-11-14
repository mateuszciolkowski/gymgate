# Inwentaryzacja PWA GymGate

Opis obecnej aplikacji (stan gałęzi `dev`, commit `cca3455`) jako wzorzec dla apki mobilnej. Każda sekcja powstała z przeczytania wskazanych plików. Teksty interfejsu są cytowane dosłownie. Zrzuty ekranów: `mobile/docs/wzorzec/`.

Stan dokumentu: w budowie. Gotowe sekcje są wymienione w `STATUS.md`.

## Spis treści

1. Ekran treningu (`workout-detail`)
2. (kolejne sekcje dopisywane w miarę postępu)

---

## 1. Ekran treningu (`workout-detail`)

Pliki: `frontend/src/features/workouts/components/workout-detail/` (`WorkoutDetailScreen.tsx`, `WorkoutItemCard.tsx`, `DraftSetRow.tsx`, `SetRowEditable.tsx`, `WorkoutNotesModal.tsx`, `WorkoutEditModal.tsx`, `formatters.ts`), `utils/workoutTimer.ts`, `utils/previousSets.ts`. Zrzuty: `20`–`23`, `30`–`31`.

Jeden ekran obsługuje trening aktywny (`DRAFT`) i zakończony (`COMPLETED`); różnią się nagłówkiem i tym, czy edycja jest włączona.

### 1.1 Wejście i wyjście

- Wejście: karta treningu na liście, karta „Trening w toku”, licznik „Kontynuuj trening” w dolnym pasku, utworzenie nowego treningu.
- Wyjście (`onBack`): zawsze do listy treningów. Wywoływane też automatycznie, gdy trening zniknie z lokalnego stanu (`!loading && !workout`) oraz gdy dowolna akcja zgłosi `WorkoutNotFoundError` (trening usunięty na serwerze).
- Parametr `pendingExerciseId`: po powrocie z ekranu „Nowe ćwiczenie” otwartego z treningu nowo utworzone ćwiczenie jest od razu dodawane do treningu.

### 1.2 Stany ekranu

| Stan | Co widać |
|---|---|
| Ładowanie | Wyśrodkowany spinner (okrąg 2 px w kolorze `--gg-a1`) |
| Błąd lub brak treningu | Tekst „Nie udało się załadować treningu” w kolorze błędu |
| Brak ćwiczeń | „Brak ćwiczeń w tej sesji”, a dla aktywnego dodatkowo „Kliknij przycisk „Dodaj ćwiczenie” powyżej” |
| Aktywny | Karta czasu, przyciski akcji, lista ćwiczeń z edycją |
| Zakończony | Karta podsumowania, lista ćwiczeń tylko do odczytu |
| Zakończony w trybie edycji | Jak zakończony, plus „Dodaj ćwiczenie” i edycja serii, ćwiczeń i notatek |

### 1.3 Górny pasek

- Przycisk „Wróć” (`aria-label="Wróć"`).
- Tytuł: `workoutName` albo „Trening”. Pod nim data `fmtDate(workoutDate)`: `pl-PL`, dzień, pełna nazwa miesiąca, rok, godzina i minuty (np. „15 listopada 2026 00:03”).
- Przyciski po prawej:
  - tylko zakończony: „Edytuj szczegóły treningu” (ikona kalendarza) otwiera modal szczegółów;
  - przycisk edycji: dla aktywnego otwiera modal szczegółów (tytuł „Edytuj szczegóły treningu”); dla zakończonego przełącza tryb edycji (tytuły „Edytuj ćwiczenia” / „Zakończ edycję ćwiczeń”, w trybie edycji ikona ptaszka i tło `--gg-a1`);
  - „Usuń trening”.

### 1.4 Trening aktywny: nagłówek

- Karta „Czas trwania” z licznikiem `MM:SS` (`fmtTimer`: minuty nie są zawijane do godzin, np. `75:03`). Odświeżana co sekundę.
- Jeśli jest `gymName`: etykieta z nazwą siłowni pod licznikiem.
- Po prawej: przycisk „Notatki” (otwiera modal notatek treningu) oraz, gdy trening ma plan, znacznik „Plan {zrobione}/{wszystkie}”. `zrobione` = ćwiczenia planu dodane do treningu lub pominięte.
- Jeśli są `workoutNotes`: klikalna karta „Notatki do treningu” z treścią (zachowuje znaki nowej linii); kliknięcie otwiera modal notatek.
- Baner planu, gdy jest plan i zostało ćwiczenie: przycisk „Kolejne z planu” + nazwa ćwiczenia (dodaje je do treningu) oraz przycisk „Pomiń”.
- Gdy plan jest i nic nie zostało: „Wszystkie ćwiczenia z planu zostały dodane”.
- Przyciski akcji w dwóch kolumnach: „Dodaj ćwiczenie” (otwiera wybór ćwiczenia) i „Zakończ trening”.

### 1.5 Trening zakończony: nagłówek

Karta podsumowania: „Czas treningu” (`fmtDuration`: „Brak danych” dla 0/null, „{h}h {m}min” albo „{m} min”), „Data i godzina”, „Siłownia” (jeśli jest), „Notatki” (jeśli są; kliknięcie otwiera modal notatek). W trybie edycji pod kartą pojawia się przycisk „Dodaj ćwiczenie”.

### 1.6 Karta ćwiczenia (`WorkoutItemCard`)

Lista posortowana po `orderInWorkout`. W danej chwili rozwinięta jest najwyżej jedna karta (stan `expandedItemId`); kliknięcie nagłówka przełącza.

Nagłówek karty:

- numer `#{n}` (kolejność na liście, nie `orderInWorkout`), nazwa ćwiczenia (ucinana wielokropkiem);
- etykiety grup mięśniowych (polskie nazwy z `MUSCLE_GROUPS`, nieznana wartość wyświetlana surowo);
- licznik „· {n} seria” dla 1, w każdym innym przypadku „serie” (także „0 serie”, „5 serie”; zastany błąd odmiany);
- notatka przeniesiona: „Uwaga: "{tekst}"” (kursywa, ucinana), źródło `item.previousNote`;
- przycisk zdjęcia ćwiczenia (jeśli ćwiczenie ma zdjęcia), „Usuń ćwiczenie” (gdy edycja dozwolona), strzałka rozwinięcia (obrót 180°, 0,15 s).

Treść po rozwinięciu:

- Jeśli istnieją statystyki ćwiczenia: „Ostatnio: {podsumowanie}” i „Rekord: {maxWeight} kg × {maxWeightReps}”. Podsumowanie to serie z ostatniego innego treningu z tym ćwiczeniem (`computePreviousSets`, format „67.5 kg × 8, 72.5 kg × 6”), a gdy takiego nie ma: „{lastWeight} kg × {lastReps}” ze statystyk.
- Lista serii. Bez serii i bez szkicu: „Brak zapisanych serii.”
- Seria tylko do odczytu (zakończony, bez trybu edycji): `#{setNumber}`, „{ciężar} kg × {powt.} powt.”
- Seria edytowalna (`SetRowEditable`): kliknięcie wartości lub „Edytuj serię” przełącza w edycję; „Usuń serię” z potwierdzeniem.
- Szkic nowej serii (`DraftSetRow`), jeśli otwarty.
- Przyciski: „+ Dodaj serię” (nieaktywny, gdy szkic jest otwarty) i „Notatki” / „Ukryj notatki”.
- Edytor notatki ćwiczenia: nagłówek „Notatka do ćwiczenia”, pole z placeholderem „Wpisz notatkę...”, 2 wiersze, autofocus, przyciski „Anuluj” i „Zapisz notatkę”.
- Zapisana notatka (gdy edytor zamknięty): karta „Notatka:” z treścią; kliknięcie otwiera edytor, jeśli edycja dozwolona.

### 1.7 Szkic serii: reguły

Edycja dozwolona (`canEdit`) = trening aktywny albo zakończony w trybie edycji.

- **Automatyczne otwarcie szkicu:** tylko przy montowaniu karty, gdy ćwiczenie nie ma serii i edycja jest dozwolona. Zwinięcie karty kasuje szkic. Ponowne rozwinięcie go nie otwiera (trzeba kliknąć „+ Dodaj serię”).
- **Numer następnej serii:** `max(setNumber) + 1` (dla pustej listy 1).
- **Wartości domyślne szkicu automatycznego:** seria o tym samym numerze z poprzedniego treningu (`previousSets`), a gdy jej nie ma: `stats.lastWeight` / `stats.lastReps`, a gdy brak statystyk: `0` / `1`.
- **Wartości domyślne po „+ Dodaj serię”:** ostatnia seria bieżącego ćwiczenia (ciężar nie mniejszy niż 0, te same powtórzenia); gdy brak serii: seria o tym numerze z poprzedniego treningu; dalej statystyki; dalej `0` / `1`.
- **Walidacja** (szkic i edycja): puste pole ciężaru = 0; błąd, gdy wartości nie są liczbami, ciężar < 0 lub powtórzenia < 1. Komunikat: „Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)”. Błąd znika przy zmianie pola.
- Pola liczbowe: ciężar z krokiem 0,5 i minimum 0, placeholder „0”, etykieta „Ciężar (kg)”; powtórzenia z minimum 1, placeholder „1”, etykieta „Powtórzenia”. Autofocus na ciężarze. Enter zatwierdza, Escape anuluje.
- Przyciski: „Zapisz serię”, „Anuluj” (w edycji istniejącej serii `aria-label` „Anuluj edycję serii”).
- Zapis szkicu wysyła `setNumber` = numer następnej serii i zamyka szkic.
- Edycja istniejącej serii wysyła tylko zmienione pola; bez zmian nic nie wysyła.

### 1.8 Akcje i komunikaty

| Akcja | Potwierdzenie / warunek | Błąd |
|---|---|---|
| Usuń serię | „Czy na pewno chcesz usunąć tę serię?” | – |
| Usuń ćwiczenie | „Czy na pewno chcesz usunąć to ćwiczenie z treningu?” | – |
| Usuń trening | „Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć.” Po sukcesie powrót do listy. | „Nie udało się usunąć treningu” |
| Zakończ trening | Bez ćwiczeń: „Dodaj przynajmniej jedno ćwiczenie przed zakończeniem treningu.” Ćwiczenie bez serii: „Ćwiczenie "{nazwa}" nie ma żadnych serii. Dodaj serię lub usuń to ćwiczenie.” (pierwsze takie ćwiczenie). Po sukcesie powrót do listy. | „Nie udało się zapisać treningu” |
| Pomiń ćwiczenie z planu | – | Cicho (zmiana optymistyczna jest wycofywana w warstwie danych) |
| Zapis notatek treningu | Treść przycinana (`trim`) | „Nie udało się zapisać notatek” |
| Zapis notatki ćwiczenia | Treść przycinana; pusta treść czyści notatkę | – |

Zakończenie wysyła `durationSeconds` = aktualna wartość licznika (z uwzględnieniem reguły porzuconego treningu, patrz 1.9).

### 1.9 Czas treningu (`utils/workoutTimer.ts`)

- `STALE_WORKOUT_MS` = 2 godziny.
- Ostatnia aktywność = największa z wartości `updatedAt` treningu, jego pozycji i ich serii.
- `computeWorkoutElapsed(workout, now)`: start = `createdAt`; jeśli `now − ostatnia aktywność > 2 h`, trening jest porzucony i koniec = ostatnia aktywność; w przeciwnym razie koniec = `now`. Wynik w pełnych sekundach, nie mniej niż 0.
- Licznik działa tylko dla treningu niezakończonego; przelicza się co sekundę z aktualnych danych treningu.

### 1.10 Modal notatek treningu (`WorkoutNotesModal`)

Tytuł „Notatki do treningu”, podtytuł „Sesja treningowa”. Pole „Treść notatki”, placeholder „Wpisz uwagi ogólne do tego treningu...”, 4 wiersze, autofocus. Przyciski „Anuluj” i „Zapisz notatki” (w trakcie: „Zapisywanie...”). Otwarcie zawsze wczytuje aktualną treść.

### 1.11 Modal szczegółów treningu (`WorkoutEditModal`)

Tytuł „Szczegóły treningu”, podtytuł „Aktywny trening” albo „Zakończony trening”.

- Pola: „Nazwa treningu” (placeholder „Nazwa treningu”), „Siłownia” (opcjonalne, placeholder „Nazwa siłowni”), „Data treningu” (pole daty, maksimum = dziś).
- Tylko zakończony: sekcja „Czas trwania sesji” z polami czasu „Rozpoczęcie” i „Zakończenie” oraz wyliczeniem „Czas całkowity: {h}h {m}m” / „{m} min” / „0 min”.
  - Wartości początkowe: rozpoczęcie = godzina z `createdAt`; zakończenie = `createdAt + durationSeconds`. Bez tych danych „12:00” i „13:00”.
  - Czas trwania = różnica godzin; gdy ujemna, dodawane są 24 godziny (trening przez północ).
- Zapis wysyła: `workoutName` i `gymName` po `trim` (puste jako brak pola, czyli nie da się wyczyścić nazwy; zastane ograniczenie), `workoutDate` jako sama data `RRRR-MM-DD` (gdy pusta: dzisiejsza), a dla zakończonego także `durationSeconds`.
- Uwaga: `workoutDate` z formularza to sama data; backend przyjmuje tylko pełny znacznik ISO (`z.string().datetime()`), a warstwa danych konwertuje wartość przed wysłaniem (do potwierdzenia w sekcji o warstwie danych).
- Przyciski „Anuluj” i „Zapisz zmiany” („Zapisywanie...”). Błąd: „Nie udało się zapisać zmian”.

---

## 2. Lista treningów (`trainings`)

Pliki: `features/workouts/components/TrainingsScreen.tsx`, `WorkoutFormModal.tsx`. Zrzuty: `10`, `11`.

### 2.1 Układ

- Nagłówek: nadtytuł „Dziennik treningowy”, tytuł „Treningi”.
- Pasek aktywności: „Ten rok {n} treningów” i „Wykonano {n} serii”, po prawej znacznik „Aktywność”.
  - `n treningów` = `statsOverview.workoutsLastYear` (ostatnie 12 miesięcy, nie rok kalendarzowy; etykieta jest myląca), a bez podsumowania liczba zakończonych treningów w pamięci.
  - `n serii` = `statsOverview.totalSets`, a bez podsumowania „–”.
- Sekcja „Trening w toku” (tylko gdy są treningi `DRAFT`; pulsująca bursztynowa kropka). Dla każdego: nazwa albo „Aktywny trening”, „{n} ćwiczeń · {m} zalogowanych serii” (bez odmiany), przycisk „Wróć”. Lista może zawierać więcej niż jeden trening `DRAFT`.
- Sekcja „Historia sesji” z licznikiem zakończonych treningów. Przełącznik sortowania „Od najnowszych” / „Od najstarszych” widoczny, gdy zakończonych jest więcej niż jeden; sortuje po `workoutDate` (oba bloki).
- Karta zakończonego treningu: nazwa albo „Trening”, etykieta czasu („{h}h {m}m” albo „{m} min”, pomijana gdy brak), data (`pl-PL`, dzień, skrócony miesiąc, rok, np. „12 lis 2026”), „• {siłownia}” jeśli jest, po prawej „{n} ćw.” i „{m} serii”.

### 2.2 Stany

- Ładowanie: spinner i „Ładowanie sesji...”.
- Brak zakończonych: „Brak ukończonych treningów” / „Rozpocznij swój pierwszy trening, klikając przycisk powyżej.” (przycisk jest w dolnym pasku, nie powyżej; zastana nieścisłość).
- Brak paginacji: wszystkie treningi są w pamięci i na liście.

### 2.3 Modal nowego treningu (`WorkoutFormModal`)

Arkusz od dołu z uchwytem. Tytuł „Nowy trening”, podtytuł „Wypełnij szczegóły i przejdź do sesji”. Kliknięcie tła zamyka.

- „Nazwa treningu (opcjonalnie)”, placeholder „np. Klatka + Triceps”.
- „Siłownia / Lokalizacja (opcjonalnie)”, placeholder „np. CityFit, Zdrofit”.
- „Data treningu”: przycisk pokazujący datę w formacie `pl-PL` (dzień, pełny miesiąc, rok), otwiera systemowy wybór daty; domyślnie dziś, maksimum dziś.
- „Plan treningowy (opcjonalnie)”: widoczny tylko, gdy istnieją plany ulubione lub wbudowane. Lista rozwijana: „Zacznij bez planu” (domyślnie), potem plany ulubione (ze znacznikiem „★ Ulubione”), potem wbudowane; przy każdym „{n} ćw.”. Kliknięcie poza listą ją zamyka.
- Wybór planu z `shortName` wpisuje tę nazwę w pole nazwy, jeśli pole jest puste albo zawiera nazwę skróconą poprzednio wybranego planu.
- Przyciski „Anuluj” i „Rozpocznij” („Tworzenie…”; oba zablokowane w trakcie).
- Wysyłka: `workoutName` i `gymName` po `trim` (puste pomijane), `workoutDate` = wybrana data z bieżącą godziną i minutą lokalną jako ISO, `workoutPlanId` jeśli wybrany.
- Po sukcesie: zamknięcie modala i przejście do ekranu treningu. Błąd: „Nie udało się utworzyć treningu” (z `AuthenticatedApp`) i odblokowanie przycisku.

Uwaga: `TrainingsScreen` ma własną kopię obsługi modala (`isFormModalOpen`, komunikat „Błąd tworzenia treningu”), ale nic jej nie otwiera; faktyczny modal otwiera `AuthenticatedApp`. Martwy kod, nie przenosić.

---

## 3. Dolny pasek, start treningu i porzucony trening

Pliki: `components/navigation/BottomNavigation.tsx`, `components/app/StaleWorkoutDialog.tsx`, `components/app/AuthenticatedApp.tsx`.

### 3.1 Dolny pasek (`BottomNavigation`)

- Trzy zakładki z ikonami bez podpisów: „Treningi”, „Ćwiczenia”, „Statystyki” (etykiety tylko dla czytników ekranu). Aktywna ma tło `--gg-surface2`, kolor `--gg-a2` i grubszą kreskę ikony (2,3 zamiast 1,8). Na ekranie treningu żadna zakładka nie jest aktywna.
- Przycisk „Otwórz menu” (szuflada).
- Po prawej:
  - bez aktywnego treningu: przycisk „Nowy trening” z plusem, otwiera modal nowego treningu;
  - z aktywnym treningiem: pastylka z pulsującą kropką i licznikiem `MM:SS` (`aria-label="Kontynuuj trening"`), otwiera ekran aktywnego treningu.
- Licznik w pastylce liczy `teraz − createdAt` bez reguły porzuconego treningu, więc po ponad 2 godzinach bezczynności pokazuje inną wartość niż ekran treningu (zastana niespójność; w apce jedna funkcja dla obu miejsc, decyzja do `DECYZJE.md`).
- Pasek jest pływający, z marginesem bezpiecznym od dołu (`max(1rem, safe-area-inset-bottom)`), tło `--gg-nav-bg` z rozmyciem.

### 3.2 Aktywny trening w skali aplikacji

- Aktywny trening = `activeWorkoutId` wskazujący na trening o statusie innym niż `COMPLETED`.
- Kliknięcie przycisku treningu w pasku: gdy jest aktywny trening, przejście do niego; w przeciwnym razie modal nowego treningu.
- Gdy otwarty na ekranie trening zniknie ze stanu, aplikacja wraca do listy treningów.

### 3.3 Dialog porzuconego treningu (`StaleWorkoutDialog`)

- Sprawdzenie raz na aktywny trening na sesję aplikacji, po zakończeniu ładowania danych: jeśli od ostatniej aktywności minęło ponad 2 godziny, pokazuje się dialog.
- Treść: „Trening się skończył?”, „Ostatnia aktywność {h}h {m}min temu” albo „{m} min temu”, nazwa treningu (jeśli jest).
- „Kontynuuj” zamyka dialog (nie pojawi się ponownie w tej sesji aplikacji).
- „Zakończ trening” kończy trening z `durationSeconds` = ostatnia aktywność − `createdAt` (z aktualnych danych, nie z migawki z chwili pokazania dialogu). Przy błędzie dialog zostaje, żeby można było ponowić.
- Dialog nie sprawdza reguł zakończenia z 1.8: pozwala zakończyć trening bez ćwiczeń lub z ćwiczeniem bez serii (zastana niespójność).
