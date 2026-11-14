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

---

## 4. Ćwiczenia

Pliki: `features/exercises/components/` (`ExercisesScreen.tsx`, `ExerciseList.tsx`, `ExerciseSelectionModal.tsx`, `AddExerciseScreen.tsx`, `EditExerciseScreen.tsx`, `ExercisePhotoButton.tsx`), `constants/muscleGroups.ts`, `utils/fuzzyMatch.ts`. Zrzuty: `40`, `41`, `22`.

### 4.1 Ekran listy (`exercises`)

Nagłówek: nadtytuł „Twoja baza”, tytuł „Ćwiczenia”, przycisk „Nowe ćwiczenie”. Pod spodem wspólny komponent listy w trybie zarządzania.

### 4.2 Lista ćwiczeń (`ExerciseList`), wspólna dla ekranu i modala wyboru

Od góry:

1. Wyszukiwarka, placeholder „Szukaj ćwiczenia...”, przycisk „✕” czyści.
2. Pastylki: sortowanie „A → Z” / „Z → A” (przełącznik), filtry „Wykonywane”, „Ze zdjęciem”, „Moje własne” (każdy włącz/wyłącz, łączą się koniunkcją).
3. Przewijany poziomo rząd grup mięśniowych; wybrana jest najwyżej jedna, ponowne kliknięcie odznacza.
4. Lista kart.

Kolejność filtrowania:

1. grupa mięśniowa (`muscleGroups` zawiera wybraną wartość);
2. widoczność: ćwiczenia bez twórcy, twórcy `"1"` lub własne;
3. w trybie wyboru: bez ćwiczeń już dodanych do treningu;
4. wyszukiwanie rozmyte po nazwie **oraz po surowych wartościach enum grup** (np. `CHEST`), nie po polskich etykietach (zastane; wpisanie „klatka” nie znajdzie grupy);
5. „Moje własne”: twórca = zalogowany użytkownik;
6. „Wykonywane”: ćwiczenie ma wpis w statystykach;
7. „Ze zdjęciem”: ma co najmniej jedno zdjęcie;
8. sortowanie po nazwie z porównaniem dla języka polskiego (`localeCompare(…, "pl")`).

Stany: ładowanie („Ładowanie ćwiczeń...”), pusto („Nie znaleziono ćwiczeń”, a w trybie wyboru z wykluczeniami „Wszystkie ćwiczenia zostały już dodane”, także wtedy, gdy pusty wynik wynika z filtrów; zastane).

Karta ćwiczenia:

- nazwa; przed nazwą ikona użytkownika, gdy ćwiczenie ma twórcę innego niż `"1"` (czyli własne lub cudze prywatne);
- przycisk zdjęcia (jeśli są zdjęcia);
- tryb zarządzania: „Edytuj” i „Usuń”, tylko gdy użytkownik jest adminem albo twórcą;
- tryb wyboru: cała karta jest klikalna, po prawej znak plusa;
- etykiety grup mięśniowych;
- opis (maksymalnie 2 linie);
- gdy są statystyki: „Ostatnio: {lastWeight} kg × {lastReps}” i „Rekord: {maxWeight} kg × {maxWeightReps}”;
- przy włączonym filtrze „Wykonywane” karty z historią są wyróżnione.

Usuwanie: potwierdzenie „Czy na pewno chcesz usunąć ćwiczenie "{nazwa}"?”; błąd „Błąd podczas usuwania ćwiczenia”. Potwierdzenie nie ostrzega, że backend kaskadowo usuwa pozycje treningów z tym ćwiczeniem (historię), statystyki i pozycje planów.

### 4.3 Modal wyboru ćwiczenia (`ExerciseSelectionModal`)

Arkusz od dołu na 90% wysokości, z uchwytem; tytuł „Wybierz ćwiczenie”, przycisk zamknięcia, przycisk „Dodaj nowe ćwiczenie” (gdy wywołujący go udostępnia), lista w trybie wyboru. Kliknięcie tła zamyka. Tło strony jest blokowane przed przewijaniem z zachowaniem pozycji; przed zamknięciem i wyborem aktywne pole traci fokus (chowa klawiaturę).

### 4.4 Nowe ćwiczenie (`add-exercise`)

Nagłówek: „Wróć”, tytuł „Nowe ćwiczenie”, podtytuł „Dodaj ćwiczenie do swojej bazy”.

- „Nazwa ćwiczenia”, placeholder „np. Wyciskanie sztangi”.
- „Grupy mięśniowe”: lista pól wyboru (na start jedno puste, opcja „-- Wybierz grupę --”); grupa wybrana w jednym polu jest niedostępna w pozostałych; przycisk usunięcia pola (gdy jest więcej niż jedno); „+ Dodaj grupę mięśniową” (dopóki pól jest mniej niż grup).
- „Opis” (opcjonalne), 3 wiersze, placeholder „Dodaj opis ćwiczenia...”.
- Tylko admin: przełącznik „Globalne ćwiczenie” ze znaczkiem „ADMIN” i opisem „Widoczne dla wszystkich użytkowników aplikacji”.
- Przycisk „Dodaj ćwiczenie” („Dodawanie...”); pola zablokowane w trakcie.

Walidacja (w tej kolejności): „Nazwa ćwiczenia jest wymagana”; „Wybierz przynajmniej jedną grupę mięśniową”. Błąd zapisu: komunikat wyjątku albo „Błąd podczas dodawania ćwiczenia”.

Wysyłka: `name` po `trim`, wybrane grupy, `description` po `trim` (puste pomijane), `isGlobal` tylko dla admina.

Powrót zależy od miejsca otwarcia: lista ćwiczeń; trening (nowe ćwiczenie jest od razu dodawane do treningu); formularz planu (nowe ćwiczenie jest dopisywane do szkicu planu).

### 4.5 Edycja ćwiczenia (`edit-exercise`)

Jak formularz dodawania, z różnicami: tytuł „Edytuj ćwiczenie” i podtytuł z nazwą ćwiczenia; pola wypełnione bieżącymi wartościami; brak przełącznika globalności; jedna walidacja „Wypełnij nazwę i wybierz przynajmniej jedną grupę mięśniową”; przycisk „Zapisz zmiany” („Zapisywanie...”); błąd „Błąd aktualizacji ćwiczenia”. Puste pole opisu jest wysyłane jako brak pola, więc opisu nie da się wyczyścić (zastane). Powrót do listy ćwiczeń.

### 4.6 Zdjęcie ćwiczenia (`ExercisePhotoButton`)

Przycisk „Pokaż zdjęcie” widoczny tylko, gdy ćwiczenie ma zdjęcia. Otwiera modal z tytułem = nazwa ćwiczenia i listą zdjęć jedno pod drugim. Przy więcej niż jednym zdjęciu nad każdym etykieta etapu: „Pozycja startowa” (`START`), „Pozycja pośrednia” (`MIDDLE`), „Pozycja końcowa” (`END`). Adres: pełny URL bez zmian, w przeciwnym razie `{API}/uploads/{ścieżka bez prefiksu uploads/}`.

### 4.7 Grupy mięśniowe (kolejność i etykiety)

`CHEST` Klatka piersiowa, `BACK` Plecy, `SHOULDERS` Barki, `BICEPS` Biceps, `TRICEPS` Triceps, `FOREARMS` Przedramiona, `ABS` Brzuch, `OBLIQUES` Skośne brzucha, `LOWER_BACK` Dolne plecy, `QUADS` Czworogłowy, `HAMSTRINGS` Kulszowo-goleniowy, `GLUTES` Pośladki, `CALVES` Łydki, `ADDUCTORS` Przywodziciele, `HIP_FLEXORS` Zginacze bioder, `TRAPS` Trapez, `LATS` Najszersze, `MIDDLE_BACK` Środek pleców, `NECK` Kark, `FULL_BODY` Całe ciało.

### 4.8 Wyszukiwanie rozmyte (`fuzzyMatch`)

- Normalizacja: małe litery, polskie znaki zamienione na łacińskie (ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z).
- Tekst i zapytanie dzielone na słowa; **każde** słowo zapytania musi pasować do **któregoś** słowa tekstu (kolejność bez znaczenia).
- Słowo pasuje, gdy: słowo tekstu je zawiera; albo odległość Levenshteina ≤ tolerancja; albo odległość do początku słowa tekstu (długość zapytania + tolerancja) ≤ tolerancja.
- Tolerancja wg długości słowa zapytania: ≤2 znaki: 0; ≤4: 1; ≤8: 2; dłuższe: 3.
- Puste zapytanie pasuje do wszystkiego.

---

## 5. Plany treningowe

Pliki: `features/plans/` (`components/PlansScreen.tsx`, `PlanFormScreen.tsx`, `PlanHistoryModal.tsx`, `planDraft.ts`, `planHistory.ts`), `contexts/data/usePlanActions.ts`. Zrzuty: `70`–`72`.

### 5.1 Ekran listy (`plans`)

- Nagłówek: nadtytuł „Twoje plany”, tytuł „Plany”.
- Podpowiedź: „★ Zaznacz gwiazdkę przy planie, aby móc wybrać go podczas tworzenia treningu”.
- Przycisk „Stwórz nowy plan”.
- Zakładki (domyślnie pierwsza): „Ulubione”, „Moje”, „Built-in”, „Społeczność”.
  - Ulubione: `isFavorite`; Moje: `creatorUserId` = użytkownik; Built-in: `creatorUserId === null`; Społeczność: cudze i publiczne.
- Wyszukiwarka „Szukaj planów…” (rozmyta, po nazwie, przycisk „×” czyści) i przycisk „Sortuj”, który pokazuje rząd opcji: „A–Z” (domyślna), „Z–A”, „Najnowsze”, „Najstarsze” (po `createdAt`).
- Puste stany wg zakładki: „Brak ulubionych” / „Kliknij ★ przy planie, aby dodać do ulubionych”; „Brak planów” / „Stwórz swój pierwszy plan treningowy”; „Brak wbudowanych planów”; „Brak publicznych planów społeczności”. Te same teksty pojawiają się, gdy pusty wynik wynika z wyszukiwania.

Karta planu:

- nazwa; „{n} ćwiczenie” (1) / „ćwiczenia” (2–4) / „ćwiczeń” (pozostałe, w tym 0; dla 22–24 forma jest błędna, zastane); „• Publiczny” gdy `isPublic`;
- do trzech pierwszych unikalnych grup mięśniowych z ćwiczeń planu;
- kliknięcie nagłówka rozwija numerowaną listę ćwiczeń (w kolejności tablicy `items`);
- przyciski: „Edytuj” (właściciel lub admin dla planu wbudowanego), „Duplikuj do moich” (gdy nie jest właścicielem; „Kopiowanie…”), gwiazdka „★”/„☆” („Usuń z ulubionych” / „Dodaj do ulubionych”), kosz „Usuń plan” (jak edycja).

Akcje i komunikaty:

| Akcja | Potwierdzenie | Błąd |
|---|---|---|
| Usuń plan | „Usunąć plan "{nazwa}"?” | „Nie udało się usunąć planu” |
| Duplikuj | – | „Nie udało się zduplikować planu” |
| Ulubione | – | „Nie udało się zmienić ulubionego” |

### 5.2 Formularz planu (`plan-form`)

- Nagłówek: „Wróć”; nadtytuł „Nowy plan” / „Edycja”; tytuł „Tworzenie planu” / „Edytuj plan”; w edycji przycisk „Historia”; przycisk „Anuluj” (działa jak „Wróć”). Wyjście bez potwierdzenia porzuca zmiany.
- „Nazwa planu”, placeholder „np. FBW Klatka Piersiowa”, limit 100 znaków.
- „Nazwa skrócona” (opcjonalne), placeholder „np. FBW Trening A”, limit 50, podpowiedź „Wpisywana automatycznie jako nazwa treningu przy wyborze planu”.
- Tylko admin: przełącznik „Globalny plan treningowy” (znaczek „ADMIN”, opis „Widoczny dla wszystkich użytkowników w zakładce „Built-in””).
- Gdy plan nie jest globalny: przełącznik „Publiczny plan”, opis „Widoczny dla innych użytkowników”.
- „Ćwiczenia ({n}/50)”: lista z uchwytem do przeciągania („Przeciągnij aby zmienić kolejność”, przeciąganie startuje po 5 px ruchu), nazwa, grupy mięśniowe po przecinku, przycisk „Usuń ćwiczenie z planu”. Pod listą „Dodaj ćwiczenie” (dopóki jest mniej niż 50), otwiera modal wyboru z wykluczeniem ćwiczeń już w planie.
- Przycisk „Zapisz plan” / „Zapisz zmiany” („Zapisywanie...”).

Walidacja (w tej kolejności, komunikat nad formularzem):

1. „Nazwa planu musi mieć co najmniej 3 znaki” (po `trim`)
2. „Nazwa planu może mieć maksymalnie 100 znaków”
3. „Dodaj co najmniej 1 ćwiczenie”
4. „Plan może zawierać maksymalnie 50 ćwiczeń”
5. „Plan publiczny lub globalny nie może zawierać prywatnych ćwiczeń” (prywatne = ma twórcę innego niż `"1"`)

Wysyłka: `name` po `trim`, `shortName` po `trim` albo `null`, `exerciseIds` w kolejności listy, `isPublic` (wymuszone `true` dla globalnego), `isGlobal` tylko dla admina. Błąd zapisu: komunikat wyjątku albo „Błąd zapisu planu”.

Szkic formularza (`planDraft.ts`): stan formularza przetrwa wyjście do ekranu „Nowe ćwiczenie” i powrót; nowo utworzone ćwiczenie jest dopisywane na koniec (bez duplikatów i ponad limit). W edycji `isGlobal` startuje jako `creatorUserId === null`.

### 5.3 Historia planu (`PlanHistoryModal`)

Tytuł „Historia planu”, podtytuł „Najnowsze zmiany na górze”. Stany: „Ładowanie…”, komunikat błędu.

Dla każdej wersji (najnowsza pierwsza): „Wersja {n}” ze znacznikiem „Aktualna” przy pierwszej, data (`pl-PL`: dzień, skrócony miesiąc, rok, godzina, minuty) i strzałka. Pod spodem lista zmian względem wersji starszej, a dla najstarszej „Wersja początkowa · {n} ćw.”. Kliknięcie rozwija pełną numerowaną listę ćwiczeń tej wersji (jedna rozwinięta naraz).

Zmiany (`planHistory.ts`, `diffVersions`), w tej kolejności:

| Typ | Znak | Opis |
|---|---|---|
| nazwa | ✎ | „Nazwa: „{stara}” → „{nowa}”” |
| nazwa skrócona | ✎ | „Nazwa skrócona: „{stara}”/brak → „{nowa}”/brak” |
| publiczność | ◉ | „Plan stał się publiczny” / „Plan stał się prywatny” |
| dodane | + (zielony `#22c55e`) | nazwa ćwiczenia |
| usunięte | − (kolor błędu) | nazwa ćwiczenia |
| przesunięte | ↕ | „{nazwa}: pozycja {z} → {na}” (pozycje od 1) |

Przesunięcia: spośród ćwiczeń obecnych w obu wersjach wyznaczany jest najdłuższy podciąg, który zachował względną kolejność; jako przesunięte oznaczane są tylko ćwiczenia spoza niego. Dzięki temu wstawienie lub pojedyncze przeciągnięcie nie oznacza wszystkich przesuniętych wierszy.

### 5.4 Warstwa danych planów (`usePlanActions`)

- Wszystkie akcje (tworzenie, edycja, usuwanie, duplikowanie, ulubione, historia) wymagają sieci. Offline rzucają „Brak połączenia z serwerem — spróbuj ponownie gdy będziesz online.” Formularz pokazuje ten tekst jako błąd; lista pokazuje własne ogólne komunikaty z 5.1.
- Nie ma aktualizacji optymistycznych: stan lokalny zmienia się po odpowiedzi serwera.
- Komunikaty błędów: „Błąd tworzenia planu”, „Błąd aktualizacji planu”, „Błąd usuwania planu”, „Błąd duplikacji planu”, „Błąd dodawania do ulubionych”, „Błąd usuwania z ulubionych”, „Nie udało się pobrać historii planu”.
- **Zastany błąd:** kod czyta `err.message` z odpowiedzi, a backend zwraca komunikat w polu `error`. W efekcie użytkownik nigdy nie widzi powodu odrzucenia (zajęta nazwa, prywatne ćwiczenia w planie publicznym), tylko ogólny tekst. W apce pokazujemy właściwy powód (odstępstwo do `DECYZJE.md`).
- Duplikowanie przy 404: odświeżenie wszystkich danych w tle i komunikat „Plan nie istnieje — plany zostały odświeżone, spróbuj ponownie.”
- Nowy lub zduplikowany plan trafia na początek listy w pamięci.
- Historia nie jest buforowana.
