# Inwentaryzacja PWA GymGate

Opis obecnej aplikacji (stan gałęzi `dev`, commit `cca3455`) jako wzorzec dla apki mobilnej. Każda sekcja powstała z przeczytania wskazanych plików. Teksty interfejsu są cytowane dosłownie. Zrzuty ekranów: `mobile/docs/wzorzec/`.

Stan dokumentu: komplet sekcji 1–12. Do uzupełnienia przy budowie ekranów: dokładne wymiary komponentów (sekcja 12.3).

## Spis treści

1. Ekran treningu
2. Lista treningów i modal nowego treningu
3. Dolny pasek, start treningu, porzucony trening
4. Ćwiczenia
5. Plany treningowe
6. Statystyki
7. Logowanie, rejestracja, sesja
8. Nawigacja, ustawienia, banery, komponenty wspólne, zachowania przeglądarki
9. Warstwa danych i obecny offline
10. API: uzupełnienie
11. Zastane błędy i niespójności
12. System wizualny

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

---

## 6. Statystyki

Pliki: `features/stats/components/` (`StatsScreen.tsx`, `StatsExerciseDetailScreen.tsx`, `StatsProgressChart.tsx`). Zrzuty: `50`–`53`.

### 6.1 Ekran główny (`stats`)

- Nagłówek: nadtytuł „Twoje postępy”, tytuł „Statystyki”.
- Trzy kafle: „Miesiąc” {`workoutsLastMonth`} „treningów” (wyróżniony), „Ten rok” {`workoutsLastYear`} „treningów”, „Łącznie” {`totalSets`} „wykonanych serii”. Bez podsumowania wszędzie 0. „Miesiąc” i „Ten rok” to ostatnie 30/365 dni liczone od teraz wstecz (dokładnie: miesiąc i rok kalendarzowy wstecz od chwili zapytania), nie bieżący miesiąc ani rok.
- Przełącznik „Rekordy” / „Aktualne” z tytułem listy „Rekordy osobiste (PR)” / „Aktualne obciążenia”.
- Lista ćwiczeń ze statystykami (każde klikalne, prowadzi do szczegółów): nazwa (albo „Ćwiczenie”) i wartość „{ciężar} kg”.
  - Rekordy: `maxWeight`, sortowanie malejąco po `maxWeight`.
  - Aktualne: ciężar pierwszej serii (`setNumber === 1`, a gdy jej brak pierwsza w tablicy) z najnowszego zakończonego treningu zawierającego to ćwiczenie (sortowanie po `workoutDate`); sortowanie malejąco po tej wartości; brak danych: „—” i wiersz przygaszony (opacity 0,5).
  - Liczby formatowane `toLocaleString("pl-PL")` (przecinek dziesiętny, np. „77,5 kg”). W innych miejscach aplikacji ciężary są pokazywane surowo z kropką (np. „77.5 kg”); zastana niespójność, zachowujemy ją dla parytetu.
- Pusto: „Brak statystyk. Zakończ pierwszy trening, aby zobaczyć rekordy.”

### 6.2 Szczegóły ćwiczenia (`stats-exercise-detail`)

- Nagłówek: „Wróć” (do statystyk), nadtytuł „Historia ćwiczenia”, tytuł = nazwa ćwiczenia albo „Szczegóły ćwiczenia”.
- Cztery kafle (2×2): „Maks. ciężar” {`maxWeight`} kg (wyróżniony), „Powt. przy PR” {`maxWeightReps`}, „Sesje” {`totalWorkouts`}, „Ostatnio” „{`lastWeight`} kg × {`lastReps`}”. Bez statystyk zera.
- Wykres „Ciężar podnoszony w czasie” (metryka `maxSetWeight`, wszystkie punkty progresji).
- „Ostatnie sesje” z przełącznikiem „Najnowsze” / „Najstarsze”: 8 najnowszych punktów progresji (przełącznik odwraca kolejność tych samych 8). Wiersz: data (`pl-PL`, dzień, skrócony miesiąc, rok) i wszystkie serie ćwiczenia z tego treningu („70 kg × 8, 72.5 kg × 6”), a gdy treningu nie ma w pamięci: „{maxSetWeight} kg × {repetitionsAtMaxSet}”.
- Pusto: „Brak historii dla tego ćwiczenia.” Błąd pobrania progresji jest traktowany jak brak danych.

### 6.3 Wykres progresji (`StatsProgressChart`)

Własny rysunek SVG w układzie 100 × 56 jednostek, skalowany do szerokości karty.

- Nagłówek: etykieta i ostatnia wartość z jednym miejscem po przecinku i sufiksem (np. „77.5 kg”).
- Bez punktów: tekst „Wykres pojawi się po zrealizowaniu sesji treningowych” (wysokość 120).
- Obszar wykresu: x od 18 do 96, y od 8 (góra) do 46 (dół). Zakres wartości = `max − min`, nie mniej niż 1.
- Punkty rozłożone równomiernie w poziomie wg kolejności (nie wg dat); pojedynczy punkt na środku.
- Linie pomocnicze (przerywane 1,5/1,5) i etykiety osi Y dla **każdej unikalnej wartości** zaokrąglonej do jednego miejsca (czcionka o stałej szerokości, rozmiar 3,6); przy wielu różnych wartościach etykiety nachodzą na siebie (zastane).
- Oś X: tylko data pierwszego i ostatniego punktu (`pl-PL`, dzień i skrócony miesiąc).
- Linia łamana przez punkty i kółko (promień 1,4) w każdym punkcie.

---

## 7. Logowanie i rejestracja

Pliki: `features/auth/components/LoginScreen.tsx`, `RegisterScreen.tsx`, `contexts/AuthContext.tsx`, `App.tsx`, `utils/auth.ts`. Zrzuty: `01`–`03`.

### 7.1 Start aplikacji (`App.tsx`)

- W trakcie wczytywania sesji: pełnoekranowy spinner i „Ładowanie...”.
- Bez użytkownika: ekran logowania (domyślnie) albo rejestracji, przełączane lokalnym stanem.
- Z użytkownikiem: aplikacja z zakładką „Treningi”.

### 7.2 Logowanie

- Logo tekstowe „GymGate”, podtytuł „Zaloguj się do swojego konta”.
- Pola: „Email” (typ e-mail, wymagane, placeholder „twoj@email.com”), „Hasło” (wymagane, minimum 6 znaków po stronie przeglądarki, placeholder „••••••••”).
- Przycisk „Zaloguj się” („Logowanie...”; pola i przycisk zablokowane w trakcie).
- Stopka: „Nie masz konta? Zarejestruj się”.
- Błąd nad formularzem: komunikat z serwera (pole `error`), a gdy go brak „Nieprawidłowy email lub hasło”; dla wyjątku innego typu „Błąd logowania”. Komunikaty serwera: „Nieprawidłowy email lub hasło” (401), „Zbyt wiele prób. Spróbuj ponownie później.” (429), błędy walidacji („Validation failed”). Błąd sieci pokazuje surowy komunikat przeglądarki (np. „Failed to fetch”); w apce zastępujemy go czytelnym tekstem (odstępstwo do `DECYZJE.md`).
- Walidacja pól (wymagane, format e-mail, długość hasła) jest natywna dla przeglądarki; w apce potrzebne własne komunikaty.

### 7.3 Rejestracja

- Logo „GymGate”, podtytuł „Stwórz nowe konto”.
- Pola: „Imię” (wymagane, „Jan”) i „Nazwisko” (wymagane, „Kowalski”) w jednym wierszu; „Email” (wymagane); „Telefon (opcjonalnie)” („+48 123 456 789”); „Hasło” (wymagane, min. 6, „Min. 6 znaków”); „Potwierdź hasło” (wymagane, min. 6, „Powtórz hasło”).
- Przycisk „Zarejestruj się” („Tworzenie konta...”). Stopka: „Masz już konto? Zaloguj się”.
- Walidacja klienta, w tej kolejności: „Hasła nie są identyczne”; „Hasło musi mieć minimum 6 znaków”.
- Walidacja serwera: „Nieprawidłowy email”, „Hasło musi mieć minimum 6 znaków”, „Imię musi mieć minimum 2 znaki”, „Nazwisko musi mieć minimum 2 znaki”. Klient nie sprawdza długości imienia i nazwiska, a przy błędzie walidacji serwer zwraca ogólne „Validation failed” ze szczegółami w `details`, których PWA nie pokazuje. W apce walidujemy te reguły lokalnie z tymi samymi tekstami.
- Zajęty e-mail: komunikat serwera (do potwierdzenia w sekcji API).
- Po sukcesie użytkownik jest od razu zalogowany. Błąd ogólny: „Błąd rejestracji”.
- Pusty telefon nie jest wysyłany.

### 7.4 Sesja (`AuthContext`, `utils/auth.ts`)

- Przechowywanie: `localStorage`, klucze `gymgate_token` (JWT) i `gymgate_user` (obiekt użytkownika: `id`, `email`, `firstName`, `lastName`, `phone`, `isAdmin`).
- Start z zapisanym tokenem i użytkownikiem: aplikacja otwiera się natychmiast z danych lokalnych; równolegle `GET /api/auth/me` z limitem 6 s.
  - 200: odświeżenie danych użytkownika.
  - 401 lub 403: wylogowanie (usunięcie tokenu i użytkownika).
  - inne statusy, błąd sieci, przekroczenie czasu: sesja zostaje.
- Start z tokenem, ale bez zapisanego użytkownika: spinner do czasu odpowiedzi `/auth/me`; przy błędzie sieci użytkownik ląduje na ekranie logowania, choć token zostaje w pamięci (zastane).
- Każde żądanie przez `authFetch`: limit 15 s (przekroczenie traktowane jak błąd sieci), `cache: no-store`, nagłówek `Authorization: Bearer`. Odpowiedź 401 przy posiadanym tokenie czyści sesję i przeładowuje stronę.
- Wylogowanie: usuwa token i użytkownika oraz czyści lokalne magazyny `workouts`, `stats`, `activeWorkout`, `pendingSync`, `metadata` (kolejka niewysłanych zmian przepada bez ostrzeżenia). Magazyny `exercises` i `plans` nie są czyszczone, więc po zalogowaniu na inne konto przez chwilę widać cudze prywatne ćwiczenia i plany, do pierwszej synchronizacji (zastany błąd; w apce dane lokalne są rozdzielone per konto).
- Token wygasa po 7 dniach; nie ma odświeżania.

---

## 8. Nawigacja, ustawienia, banery i komponenty wspólne

Pliki: `components/navigation/NavigationDrawer.tsx`, `components/layouts/MainLayout.tsx`, `components/app/*`, `features/menu/components/MenuScreen.tsx`, `hooks/useNavigation.ts`, `hooks/useTheme.ts`, `utils/pwaUpdate.ts`, `components/ui/*`, `vite.config.ts`, `index.html`. Zrzuty: `60`, `80`, `81`.

### 8.1 Model nawigacji

Brak routera i adresów URL; przycisk „wstecz” przeglądarki nie działa w obrębie aplikacji. Stan: `activeTab` (`trainings`, `exercises`, `stats`, `plans`, `menu`) i `screen` (zakładka albo ekran podrzędny). Zmiana zakładki ustawia też ekran. Ekran startowy: `trainings`.

Mapa przejść:

| Z | Do | Powrót |
|---|---|---|
| Treningi | `workout-detail` (karta, „Trening w toku”, pastylka w pasku, nowy trening) | Treningi |
| Ćwiczenia | `add-exercise` | Ćwiczenia |
| Ćwiczenia | `edit-exercise` | Ćwiczenia |
| `workout-detail` → modal wyboru → „Dodaj nowe ćwiczenie” | `add-exercise` | `workout-detail` + automatyczne dodanie nowego ćwiczenia |
| Statystyki | `stats-exercise-detail` | Statystyki |
| Plany | `plan-form` (nowy / edycja) | Plany |
| `plan-form` → modal wyboru → „Dodaj nowe ćwiczenie” | `add-exercise` | `plan-form` z zachowanym szkicem + dopisane ćwiczenie |

Uwagi:

- Ekran podrzędny nie zmienia `activeTab`, więc w dolnym pasku podświetlona zostaje zakładka pochodzenia (wyjątek: ekran treningu gasi wszystkie).
- Kliknięcie zakładki z dowolnego ekranu podrzędnego przechodzi do niej bez potwierdzenia (niezapisany formularz przepada).
- Wybrany trening, edytowane ćwiczenie i szkic planu żyją w stanie `AuthenticatedApp`, nie przetrwają przeładowania strony.
- Zakładki „Plany” i „Ustawienia” są dostępne tylko z szuflady.
- Zmiana ekranu odgrywa animację wejścia (`screen-enter`: 0,2 s, przezroczystość 0→1, przesunięcie 8 px w górę, krzywa `cubic-bezier(0.16, 1, 0.3, 1)`).

### 8.2 Szuflada (`NavigationDrawer`)

- Panel z lewej, szerokość 330 px, z przyciemnionym tłem. Otwierana przyciskiem w dolnym pasku lub przeciągnięciem od lewej krawędzi; zamykana przyciskiem „Zamknij menu”, kliknięciem tła lub przeciągnięciem w lewo.
- Gest: start po 8 px ruchu; otwarcie po przeciągnięciu ≥ 35% szerokości (115,5 px), zamknięcie po ≥ 30% (99 px); panel i przyciemnienie podążają za palcem.
- Zawartość: awatar z inicjałami (pierwsze litery imienia i nazwiska, wielkie; bez użytkownika „?”), imię i nazwisko, e-mail; pozycje „Historia treningów”, „Ćwiczenia”, „Statystyki”, „Plany treningowe”, „Ustawienia” (aktywna wyróżniona); na dole „Wyloguj się” i „GymGate v1.0.0”.
- Wybór pozycji przełącza zakładkę i zamyka szufladę. Wylogowanie bez potwierdzenia.
- W apce: gest od lewej krawędzi koliduje z systemowym gestem cofania na iOS; rozstrzygnięcie w `PLAN.md`.

### 8.3 Ustawienia (`menu`)

- Nagłówek: nadtytuł „Ustawienia”, tytuł „Profil i opcje”.
- Karta profilu (tylko odczyt): inicjały, imię i nazwisko, e-mail.
- „Motyw kolorystyczny” / „Aktualny: {nazwa}”: otwiera arkusz „Wybierz motyw kolorystyczny” z zakładkami „Ciemne” / „Jasne” (startowa wg bieżącego motywu). Każdy motyw: podgląd palety, nazwa, opis, znacznik przy aktywnym. Wybór stosuje motyw i zamyka arkusz.
- „Odśwież pamięć podręczną (Cache)” / „Wyczyść dane offline i pobierz najnowsze z serwera”: potwierdzenie „Pobrać świeże dane z serwera i zaktualizować lokalną bazę?”, potem „Pomyślnie zsynchronizowano dane z serwerem.” albo „Nie udało się zresetować lokalnego cache.”
- „Wyloguj się” (bez potwierdzenia).
- Stopka: „GymGate v1.0.0 · Offline-First Training App”.

Motywy (identyfikator, nazwa, opis):

| Ciemne | Jasne |
|---|---|
| `dark` Ciemny, Emerald Dark | `light` Jasny, Emerald Light |
| `steel` Stalowy, Steel Blue | `blossom` Różany, Blossom Light |
| `graphite` Grafitowy, Graphite Dark | `sky` Niebieski, Sky Light |
| `violet` Fioletowy, Violet Dark | `sand` Piaskowy, Sand Light |
| `ember` Bursztynowy, Ember Dark | `sage` Szałwiowy, Sage Light |
| `crimson` Karmazynowy, Crimson Dark | `slate` Grafitowy jasny, Slate Light |

Motyw jest zapisywany w `localStorage` pod kluczem `theme` (domyślnie `dark`, nieznana wartość też daje `dark`) i stosowany jako klasa na elemencie `html`. Jest ustawieniem urządzenia, nie konta: nie synchronizuje się i przetrwa wylogowanie. Aplikacja nie reaguje na systemowy tryb ciemny/jasny.

### 8.4 Banery globalne (nad treścią, w tej kolejności)

1. **Offline** (gdy `isOnline` jest fałszem): „Brak połączenia z internetem — pracujesz offline”.
2. **Nowa wersja** (specyficzny dla PWA): „Dostępna nowa wersja aplikacji” + „Odśwież”. Service worker działa w trybie „prompt”: nowa wersja pobiera się w tle, a aktywuje dopiero po kliknięciu, żeby aplikacja nie przeładowała się w trakcie treningu. W apce bez odpowiednika.
3. **Nieudana synchronizacja** (gdy są operacje trwale nieudane): „Nie udało się zsynchronizować zmian:” i lista unikalnych opisów „{akcja} {obiekt}”, gdzie akcja to „Zapisanie” / „Aktualizacja” / „Usunięcie”, a obiekt „treningu” / „ćwiczenia w treningu” / „serii” / „ćwiczenia” / „planu”. Przyciski „Ponów” (nieaktywny offline, podpowiedź „Dostępne po powrocie online”) i „Zamknij”.

### 8.5 Komponenty wspólne (`components/ui`)

| Komponent | Zachowanie |
|---|---|
| `Modal` | Wyśrodkowane okno z tytułem, podtytułem i przyciskiem „Zamknij”; zamyka się klawiszem Escape i kliknięciem tła; szerokości `sm`/`md`/`lg`/`xl` |
| `Button` | Warianty `primary`, `secondary`, `danger`, `ghost`; rozmiary `sm` (38 px, tekst 13, promień 12), `md` (44 px, 14, 14), `lg` (52 px, 15, 16); stan ładowania ze spinnerem i opcjonalnym tekstem; ikona; pełna szerokość |
| `Switch` | Przełącznik z etykietą, opisem, znaczkiem i ikoną; warianty `accent` (`--gg-a1`), `admin` (`--gg-a2`), `default`; włączony zmienia obramowanie i tło kontenera |
| `FormField` | Etykieta wielkimi literami, znacznik „(opcjonalnie)”, podpowiedź, komunikat błędu |
| `EmptyState` | Ikona, tytuł, opis |

Nieużywane (martwy kod, nie przenosić): `ScreenHeader`, `FilterChip`, `ScreenContainer`, `NavButton`, `AddWorkoutButton`.

### 8.6 Zachowania zależne od przeglądarki i ich natywne odpowiedniki

| PWA | Apka |
|---|---|
| Service worker z precache zasobów i trybem „prompt”; baner nowej wersji | Zasoby w paczce aplikacji; aktualizacje przez sklep |
| Manifest: nazwa „GymGate”, `display: standalone`, kolor tła i motywu `#111827`, ikony 192 i 512 px (maskowalne) | Ikona i splash aplikacji |
| `viewport-fit=cover`, `user-scalable=no`, `maximum-scale=1` | Safe area; brak powiększania to domyślne zachowanie natywne |
| `overscroll-behavior: none` (wyłącza pull-to-refresh przeglądarki) | Brak pull-to-refresh w PWA, więc w apce też go nie ma; odświeżanie tylko z Ustawień |
| `touch-action: manipulation`, brak podświetlenia dotyku | Natywne zachowanie dotyku + haptyka |
| Blokada przewijania tła pod modalem wyboru ćwiczenia | Natywny arkusz |
| `navigator.onLine` i zdarzenia `online`/`offline` | Biblioteka stanu sieci; uwaga: `onLine` bywa prawdą bez realnego dostępu do serwera |
| `confirm()` / `alert()` | Natywne alerty z tymi samymi tekstami |
| `localStorage` (token, użytkownik, motyw) | Magazyn systemowy na token; zwykły magazyn na motyw |
| IndexedDB + `navigator.storage.persist()` | SQLite |
| Pola `type="date"`, `type="time"`, `type="number"`, `select` | Natywne selektory daty, czasu i wyboru; klawiatura numeryczna z separatorem dziesiętnym |
| Enter / Escape w wierszu serii | Przycisk „gotowe” klawiatury zatwierdza |
| Atrybuty `title` (podpowiedzi po najechaniu) | Etykiety dostępności |

---

## 9. Warstwa danych i obecny offline

Pliki: `contexts/data/*` (`useDataStore.ts`, `useDataSync.ts`, `useWorkoutActions.ts`, `useWorkoutItemActions.ts`, `useExerciseActions.ts`, `usePlanActions.ts`, `hooks.ts`), `utils/localStore.ts`, `utils/syncManager.ts`.

Mechanizm nie jest przenoszony do apki (sekcja 6 zlecenia). Opis służy temu, żeby apka zachowała widoczne dla użytkownika zachowania i nie powtórzyła zastanych błędów.

### 9.1 Stan globalny

`workouts[]` (z pozycjami i seriami), `exercises[]`, `stats[]`, `statsOverview`, `activeWorkoutId`, `plans[]`, `isLoading`, `isOnline`, `lastSync`, `failedSyncOperations[]`.

### 9.2 Start i pobieranie danych

- Po zalogowaniu: wczytanie wszystkiego z IndexedDB, natychmiastowe pokazanie interfejsu, a w tle pełne pobranie z serwera: `GET /api/workouts` (wszystkie treningi z pozycjami i seriami, bez paginacji), `/api/exercises`, `/api/workouts/active`, `/api/workouts/stats/all`, `/api/workouts/stats/overview`, `/api/plans?tab=mine|builtin|community` (trzy żądania, wynik łączony bez duplikatów).
- Dane z serwera **zastępują** lokalne w całości.
- Ochrona przed nadpisaniem świeżych zmian: treningi i `activeWorkoutId` nie są pobierane ani podmieniane, gdy w kolejce czekają zmiany treningów lub gdy w trakcie żądania zaszła lokalna zmiana treningu (licznik zapisów).
- Synchronizacja cykliczna co 2 minuty, po zdarzeniu `online` i po powrocie karty na pierwszy plan (iOS gubi zdarzenia `online` i wstrzymuje timery w tle).
- Zmiana zalogowanego użytkownika czyści treningi, statystyki, aktywny trening, kolejkę i metadane.

### 9.3 Wzorzec zapisu

Dla treningów, pozycji, serii i ćwiczeń: natychmiastowa zmiana w pamięci i IndexedDB, potem żądanie do API; przy błędzie sieci operacja trafia do kolejki, przy błędzie serwera zmiana jest wycofywana.

- Za błąd sieci uznaje się każdy `TypeError` (w tym przekroczenie 15 s) oraz każdą sytuację, gdy `navigator.onLine` jest fałszem.
- Zmiana treningu idzie przez kolejkę (a nie bezpośrednio), gdy: brak sieci, trening ma tymczasowy identyfikator albo wcześniejsze zmiany tego treningu jeszcze czekają. Chroni to kolejność (np. zakończenie nie wyprzedzi zapisu serii).
- Identyfikatory tymczasowe: `temp_workout_{ms}`, `temp_item_{ms}`, `temp_set_{ms}`, `temp_exercise_{ms}`; mapowanie na prawdziwe jest utrwalane i przeżywa przeładowanie strony. Ten sam identyfikator jest wysyłany jako `clientId`, po którym backend deduplikuje ponowienia.
- Podwójne kliknięcie „Rozpocznij” zwraca tę samą trwającą operację.
- Usunięcie obiektu z tymczasowym identyfikatorem nie anuluje oczekującego utworzenia, tylko kolejkuje usunięcie za nim (utworzenie mogło już dotrzeć do serwera).
- Po zmianach w zakończonym treningu, po zakończeniu i po usunięciu treningu statystyki są pobierane ponownie z serwera, a bufor progresji czyszczony. Offline statystyki się nie zmieniają.

### 9.4 Kolejka (`syncManager`)

- Operacja: typ (`create`/`update`/`delete`), obiekt (`workout`/`workoutItem`/`set`/`exercise`), adres, metoda, dane, znacznik czasu, licznik prób.
- Wysyłka w kolejności dodania; identyfikatory tymczasowe w adresie i danych są podmieniane na prawdziwe. Operacja z nierozwiązanym identyfikatorem czeka; po 3 cyklach jest oznaczana jako trwale nieudana.
- Odpowiedzi:
  - błąd sieci: bez zwiększania licznika, ponowienie przy następnej okazji;
  - 408, 425, 429, 502, 503, 504: przejściowe, bez zwiększania licznika;
  - 404 dla operacji na treningu: operacja usuwana, trening kasowany lokalnie (z komunikatem „Ten trening nie istnieje już na serwerze — został usunięty z urządzenia.” przy akcjach bezpośrednich);
  - 404 dla pozycji lub serii: operacja porzucana, trening zostaje;
  - inne błędy: do 3 prób, potem trwała porażka.
- Operacje trwale nieudane zostają w IndexedDB i są pokazywane w banerze; „Ponów” zeruje ich licznik i próbuje ponownie; „Zamknij” tylko chowa baner.
- Po opróżnieniu kolejki następuje pełne pobranie danych.

### 9.5 Buforowanie statystyk

- `stats[]` i `statsOverview` są kopią z serwera (IndexedDB).
- Progresja ćwiczenia: bufor w pamięci na czas sesji aplikacji oraz kopia w IndexedDB używana tylko offline. Offline bez kopii żądanie kończy się błędem, a ekran pokazuje pusty wykres i brak historii.

### 9.6 „Odśwież pamięć podręczną”

Czyści lokalne treningi, ćwiczenia, statystyki, aktywny trening, **kolejkę oczekujących zmian** i metadane, po czym pobiera wszystko z serwera. Plany nie są czyszczone.

### 9.7 Zastane wady obecnego offline

Poza ograniczeniami opisanymi w zleceniu:

- Trening utworzony offline dostaje na serwerze `createdAt` z chwili synchronizacji, a nie startu; po pełnym pobraniu licznik czasu przeskakuje.
- `skipPlanExercise` offline (lub dla treningu z tymczasowym identyfikatorem) zmienia tylko stan lokalny i **nie trafia do kolejki**; najbliższe pełne pobranie cofa pominięcie.
- „Odśwież pamięć podręczną” kasuje niewysłane zmiany bez ostrzeżenia, a uruchomione offline zostawia aplikację bez danych do powrotu sieci.
- Wylogowanie kasuje niewysłane zmiany bez ostrzeżenia.
- Plany są wyłącznie online.
- Statystyki nie reagują na zmiany zrobione offline.

---

## 10. API: uzupełnienie do opisów modułów

Pełne kontrakty są w `backend/src/modules/*/API.md` i `docs/api/openapi.yaml`. Tu tylko to, co istotne dla apki, a czego tam nie widać.

- Każda odpowiedź: `{ success, data }` albo `{ success: false, error, details? }`.
- Błąd walidacji (Zod): status **400**, `error: "Validation failed"`, `details: [{ path, message }]`. (`backend/CLAUDE.md` podaje 422; faktycznie jest 400.)
- Middleware `validate` tylko sprawdza dane, nie podmienia ich na wynik parsowania: wartości domyślne i transformacje ze schematów (np. `tab` domyślnie `mine`, `limit` jako liczba) nie trafiają do kontrolera w ten sposób.
- Rejestracja z zajętym e-mailem: „Użytkownik z tym emailem już istnieje”.
- Limit logowania i rejestracji: 10 żądań na 15 minut na IP, licznik w pamięci procesu; odpowiedź 429 „Zbyt wiele prób. Spróbuj ponownie później.”
- `POST /api/workouts` przy istniejącym aktywnym treningu `DRAFT` zwraca ten istniejący (status jak dla utworzenia), ignorując przesłane dane. Wyjątek: ten sam `clientId` zawsze zwraca swój trening.
- `PATCH /api/workouts/:id` wymaga `workoutDate` jako pełnego znacznika ISO; sama data jest odrzucana (patrz 11, błąd B1).
- `weight` w seriach i statystykach wraca jako tekst (`"77.5"`), w progresji jako liczba.
- `GET /api/exercises` zwraca ćwiczenia globalne (`creatorUserId` puste lub `"1"`) i własne, posortowane od najnowszych, z `photos` i pełnym obiektem `creator`.
- Usunięcie ćwiczenia kaskadowo usuwa: pozycje treningów z tym ćwiczeniem (i ich serie), statystyki, oczekujące notatki i pozycje planów. Statystyki pozostałych ćwiczeń nie wymagają przeliczenia, ale podsumowanie (`totalSets`, `totalVolume`) się zmienia.
- Użytkownik testowy z `seed-local.ts` ma identyfikator niebędący UUID (`local-test-user-1`); w produkcji występuje też historyczny twórca `"1"`. Identyfikatorów użytkowników nie wolno walidować jako UUID.

---

## 11. Zastane błędy i niespójności

Błędów nie przenosimy. Każde odstępstwo apki od zachowania PWA jest odnotowywane w `DECYZJE.md`.

### 11.1 Błędy funkcjonalne

| # | Błąd | Gdzie | W apce |
|---|---|---|---|
| B1 | **Edycja szczegółów treningu nie działa online.** Modal wysyła `workoutDate` jako `RRRR-MM-DD`, backend wymaga pełnego ISO i odrzuca całe żądanie (400). Użytkownik widzi „Nie udało się zapisać zmian”; nie zapisuje się też nazwa, siłownia ani czas trwania. Offline zmiana trafia do kolejki i kończy jako trwale nieudana. Potwierdzone żądaniem do lokalnego backendu. | `WorkoutEditModal.tsx`, `workout.schema.ts` | Wysyłamy poprawny znacznik czasu |
| B2 | `GET /api/exercises` i `/api/exercises/:id` zwracają cały wiersz twórcy, w tym hash hasła. | `exercise.repository.ts` (`creator: true`) | Naprawa w backendzie (zgodna wstecznie) |
| B3 | Komunikaty serwera przy błędach planów nie są pokazywane (klient czyta `message`, serwer wysyła `error`). | `usePlanActions.ts` | Pokazujemy powód |
| B4 | Pominięcie ćwiczenia z planu offline nie jest synchronizowane i znika. | `useWorkoutActions.ts` | Normalna zmiana w kolejce |
| B5 | Trening utworzony offline ma na serwerze czas startu z chwili synchronizacji. | backend `createdAt` | Serwer przyjmuje czas startu z telefonu |
| B6 | „Odśwież pamięć podręczną” i wylogowanie kasują niewysłane zmiany bez ostrzeżenia. | `useDataSync.ts`, `AuthContext.tsx` | Najpierw wysyłka kolejki albo ostrzeżenie |
| B7 | Po wylogowaniu zostają lokalne ćwiczenia i plany poprzedniego konta. | `AuthContext.tsx` | Dane lokalne rozdzielone per konto |
| B8 | `updateWorkoutSet` w backendzie wykonuje pusty zapis przed sprawdzeniem uprawnień: podbija `updatedAt` cudzej serii, a dla nieistniejącej zwraca 500 zamiast 404. | `workout.service.ts` | Naprawa w backendzie |
| B9 | Dialog porzuconego treningu pozwala zakończyć trening bez ćwiczeń lub z ćwiczeniem bez serii, wbrew regułom ekranu treningu. | `AuthenticatedApp.tsx` | Decyzja w `PLAN.md` (domyślnie: jak w PWA, bo to ratunkowe zamknięcie) |
| B10 | Licznik w dolnym pasku nie stosuje reguły porzuconego treningu i po ponad 2 godzinach bezczynności różni się od licznika na ekranie treningu. | `BottomNavigation.tsx` | Jedna funkcja dla obu miejsc |
| B11 | Nazwy treningu, siłowni i opisu ćwiczenia nie da się wyczyścić (puste pole jest pomijane w żądaniu). | modale edycji | Decyzja w `PLAN.md` (domyślnie: pozwalamy wyczyścić) |

### 11.2 Teksty i drobne niespójności (zachowujemy dla parytetu, chyba że zaznaczono)

- „{n} serie” dla każdej liczby poza 1 (karta ćwiczenia); „{n} ćwiczeń · {m} zalogowanych serii” bez odmiany; „ćwiczenia” dla 22–24 w planach. W apce poprawna odmiana (odstępstwo do `DECYZJE.md`).
- Zakładka planów „Built-in” po angielsku wśród polskich.
- „Ten rok” i „Miesiąc” oznaczają ostatnie 12 miesięcy i ostatni miesiąc, nie okresy kalendarzowe.
- Ciężary raz z przecinkiem (lista statystyk), raz z kropką (wszędzie indziej).
- Pusty stan listy treningów odsyła do przycisku „powyżej”, który jest w dolnym pasku.
- Wyszukiwanie ćwiczeń dopasowuje angielskie wartości grup mięśniowych zamiast polskich etykiet. W apce dopasowujemy etykiety (odstępstwo).
- Pusty wynik filtrowania w modalu wyboru pokazuje „Wszystkie ćwiczenia zostały już dodane”.
- Trzy różne formaty czasu trwania: „1h 5min” (ekran treningu), „1h 5m” (lista, modal edycji), „Brak danych” / „0 min” / pusty dla braku.
- Komunikaty błędów backendu częściowo po angielsku (plany, ćwiczenia).

### 11.3 Długi techniczne (bez wpływu na apkę)

- Martwy kod: druga obsługa modala nowego treningu w `TrainingsScreen`, komponenty `ScreenHeader`, `FilterChip`, `ScreenContainer`, `NavButton`, `AddWorkoutButton`, hooki zgodności w `hooks.ts`.
- Typ `MuscleGroup` we frontendzie zawiera `LEGS`, którego nie ma w bazie.
- `tailwind.config.js` zawiera starą paletę kolorów niezgodną z `index.css`; obowiązuje `index.css`.
- Kolor motywu w manifeście i `index.html` (`#111827`) nie pasuje do żadnego motywu.
- `CLAUDE.md` i `PRODUCT.md` opisują ciasteczko httpOnly; faktycznie jest token Bearer w `localStorage`.
- `CLAUDE.md` wymienia kolekcję Postmana, której nie ma w repo.
- Lint frontendu zgłasza 25 problemów; nie jest częścią CI.

---

## 12. System wizualny

Źródło prawdy: `frontend/src/index.css`. Wartości wszystkich motywów w formie do wczytania przez apkę: `mobile/docs/tokeny-motywow.json` (wygenerowane skryptem z `index.css`).

### 12.1 Tokeny (każdy motyw definiuje komplet)

| Token | Rola |
|---|---|
| `--gg-bg` | tło aplikacji |
| `--gg-surface`, `--gg-surface2`, `--gg-surface3` | karty; pola i przyciski drugorzędne; elementy zagnieżdżone |
| `--gg-border`, `--gg-border-med`, `--gg-border-strong` | obramowania o rosnącym kontraście |
| `--gg-text`, `--gg-text-sub`, `--gg-text-muted` | tekst główny, pomocniczy, wyciszony |
| `--gg-a1`, `--gg-a2` | akcent podstawowy i jaśniejszy (wartości, aktywne ikony) |
| `--gg-btn-bg`, `--gg-btn-hover` | przycisk główny; oba tworzą gradient 135° (`--gg-grad-btn`) |
| `--gg-glow` | poświata przycisku: `--gg-btn-bg` w 35% krycia |
| `--gg-tag-bg`, `--gg-tag-text` | etykiety grup mięśniowych |
| `--gg-record-bg`, `--gg-record-text` | wyróżnienie rekordu |
| `--gg-nav-bg` | półprzezroczyste tło dolnego paska (z rozmyciem) |
| `--gg-shadow`, `--gg-shadow-elevated` | cień karty i elementu uniesionego |
| `--gg-active-border`, `--gg-active-glow`, `--gg-active-bg` | aktywny trening i ostrzeżenia (bursztyn) |
| `--gg-error` | błąd (`#EF4444`; nadpisany w `ember` i `crimson`) |

### 12.2 Typografia

- Tekst podstawowy: DM Sans (400, 500, 600, 700, kursywa 400).
- Nagłówki i liczby: Barlow (400–900), klasa `font-barlow`.
- Barlow Condensed (600–900) jest ładowany; użycia do potwierdzenia przy budowie komponentów.
- Liczby (ciężary, powtórzenia, liczniki): cyfry tabelaryczne (`num-tabular`). Licznik w pasku i etykiety wykresu: czcionka o stałej szerokości.
- Wygładzanie czcionek włączone. Rozmiary podawane w pikselach przy elementach (najczęstsze: 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 28).

### 12.3 Kształt i ruch

- Promienie: 12, 14, 16, 18 px dla pól i przycisków; 24 i 28 px dla arkuszy i dużych kart; pełne zaokrąglenie dla pastylek.
- Minimalna wysokość elementów dotykowych: 44 px (reguła globalna dla ekranów do 768 px).
- Ekrany: margines boczny 20 px (ekran treningu 16 px), dolny odstęp 112 px pod pływający pasek, maksymalna szerokość treści 672 px.
- Animacje: wejście ekranu 0,2 s; obrót strzałek 0,15 s; zmiana tła przy zmianie motywu 0,25 s; pulsowanie kropki aktywnego treningu; spinner. Przy systemowym ograniczeniu ruchu wszystkie animacje i przejścia są praktycznie wyłączone.
- Efekty: rozmycie tła pod modalami (4–6 px) i pod dolnym paskiem; przyciemnienie tła modali `rgba(0,0,0,0.55–0.75)`.

Dokładne wymiary poszczególnych komponentów (odstępy, rozmiary ikon, grubości obramowań) są w stylach inline plików komponentów i na zrzutach w `wzorzec/`; przy budowie każdego ekranu odczytujemy je z pliku źródłowego.

### 12.4 Ikony

Ręcznie pisane SVG w komponentach (siatka 24 × 24, kreska 1,8–2,5, zaokrąglone końce), bez biblioteki. W apce przenosimy te same ścieżki. Zestaw wydzielony w `components/icons/`: `ArchiveIcon`, `ChartIcon`, `DumbbellIcon`, `EditIcon`, `MenuIcon`, `PhotoIcon`, `PlusIcon`, `TrashIcon`; pozostałe są wpisane bezpośrednio w ekranach.
