# Lista kontrolna parytetu

Każda pozycja to funkcja lub stan PWA, który apka musi odtworzyć. Opis zachowania: `INWENTARYZACJA.md` (numer sekcji w nawiasie). Pozycję odhaczamy dopiero po sprawdzeniu w apce, z notatką o sposobie weryfikacji: `[x] … — test jednostkowy / E2E / zrzut vs wzorzec / ręcznie na symulatorze`.

Oznaczenia: `[ ]` do zrobienia, `[x]` zweryfikowane, `[~]` zrobione, niezweryfikowane na urządzeniu, `[o]` świadome odstępstwo (wpis w `DECYZJE.md`).

Stan: 0 z 243 pozycji.

## A. Start, logowanie, rejestracja, sesja (7)

- [ ] A1 Ekran ładowania sesji: spinner i „Ładowanie...”
- [ ] A2 Logowanie: układ, pola, placeholdery, przycisk i jego stan „Logowanie...”
- [ ] A3 Logowanie: blokada pól w trakcie
- [ ] A4 Logowanie: błąd „Nieprawidłowy email lub hasło”
- [ ] A5 Logowanie: błąd limitu prób „Zbyt wiele prób. Spróbuj ponownie później.”
- [ ] A6 Logowanie: czytelny komunikat przy braku sieci (odstępstwo od surowego błędu przeglądarki)
- [ ] A7 Logowanie: walidacja pól wymaganych, formatu e-mail i minimalnej długości hasła
- [ ] A8 Przejście logowanie ↔ rejestracja
- [ ] A9 Rejestracja: układ, sześć pól, placeholdery, stan „Tworzenie konta...”
- [ ] A10 Rejestracja: „Hasła nie są identyczne”
- [ ] A11 Rejestracja: „Hasło musi mieć minimum 6 znaków”
- [ ] A12 Rejestracja: imię i nazwisko minimum 2 znaki (teksty serwera, walidacja lokalna)
- [ ] A13 Rejestracja: „Nieprawidłowy email”
- [ ] A14 Rejestracja: „Użytkownik z tym emailem już istnieje”
- [ ] A15 Rejestracja: pusty telefon nie jest wysyłany
- [ ] A16 Rejestracja: automatyczne zalogowanie po sukcesie
- [ ] A17 Sesja przetrwa restart apki; apka otwiera się od razu z danych lokalnych
- [ ] A18 Weryfikacja sesji w tle; wylogowanie tylko przy jawnym odrzuceniu (401/403)
- [ ] A19 Brak sieci i błędy 5xx nie wylogowują
- [ ] A20 Istniejące konto z PWA loguje się i widzi wszystkie swoje dane
- [ ] A21 Wylogowanie z szuflady i z ustawień
- [ ] A22 Dane lokalne rozdzielone per konto (naprawa B7)

## B. Nawigacja i szkielet (8.1, 8.2, 3.1)

- [ ] B1 Ekran startowy: Treningi
- [ ] B2 Dolny pasek: trzy zakładki z ikonami, stan aktywny (tło, kolor, grubość kreski)
- [ ] B3 Dolny pasek: przycisk szuflady
- [ ] B4 Dolny pasek: „Nowy trening” bez aktywnego treningu
- [ ] B5 Dolny pasek: pastylka z licznikiem przy aktywnym treningu, prowadzi do treningu
- [ ] B6 Dolny pasek: żadna zakładka nie jest aktywna na ekranie treningu
- [ ] B7 Dolny pasek: pływający, rozmyte tło, margines bezpieczny od dołu
- [ ] B8 Szuflada: otwarcie przyciskiem, zamknięcie przyciskiem i tłem
- [ ] B9 Szuflada: gest otwarcia od krawędzi i zamknięcia przeciągnięciem, progi 35% / 30%
- [ ] B10 Szuflada: profil z inicjałami, imieniem, nazwiskiem, e-mailem
- [ ] B11 Szuflada: pięć pozycji, wyróżnienie aktywnej, przejście i zamknięcie
- [ ] B12 Szuflada: „Wyloguj się”, „GymGate v1.0.0”
- [ ] B13 Ekrany podrzędne na natywnym stosie z gestem cofania
- [ ] B14 Powrót z „Nowe ćwiczenie” do treningu z automatycznym dodaniem ćwiczenia
- [ ] B15 Powrót z „Nowe ćwiczenie” do formularza planu z zachowanym szkicem i dopisanym ćwiczeniem
- [ ] B16 Powrót z „Nowe ćwiczenie” do listy ćwiczeń
- [ ] B17 Zniknięcie otwartego treningu wraca do listy
- [ ] B18 Animacja wejścia ekranu zastąpiona natywnym przejściem; ograniczenie ruchu respektowane

## C. Lista treningów (2)

- [ ] C1 Nagłówek „Dziennik treningowy” / „Treningi”
- [ ] C2 Pasek aktywności: liczba treningów (ostatnie 12 miesięcy) i serii, znacznik „Aktywność”
- [ ] C3 Pasek aktywności: wartości zastępcze bez podsumowania
- [ ] C4 Sekcja „Trening w toku”: karta, teksty, przycisk „Wróć”, pulsująca kropka
- [ ] C5 Sekcja „Trening w toku”: więcej niż jeden trening DRAFT
- [ ] C6 „Historia sesji” z licznikiem
- [ ] C7 Sortowanie „Od najnowszych” / „Od najstarszych” (widoczne przy więcej niż jednym)
- [ ] C8 Karta treningu: nazwa lub „Trening”, czas, data, siłownia, liczba ćwiczeń i serii
- [ ] C9 Stan ładowania „Ładowanie sesji...”
- [ ] C10 Stan pusty „Brak ukończonych treningów”
- [ ] C11 Płynne przewijanie długiej historii (setki treningów)

## D. Nowy trening (2.3)

- [ ] D1 Arkusz: tytuł, podtytuł, uchwyt, zamknięcie tłem
- [ ] D2 Pola nazwy i siłowni z placeholderami
- [ ] D3 Data: domyślnie dziś, maksimum dziś, format wyświetlania, natywny wybór
- [ ] D4 Wybór planu: widoczny tylko przy planach ulubionych lub wbudowanych
- [ ] D5 Wybór planu: „Zacznij bez planu”, ulubione pierwsze ze znacznikiem, liczba ćwiczeń
- [ ] D6 Wybór planu wpisuje nazwę skróconą wg reguły (puste pole lub nazwa poprzedniego planu)
- [ ] D7 „Rozpocznij” / „Tworzenie…”, blokada podwójnego wysłania
- [ ] D8 Data z bieżącą godziną jako `workoutDate`
- [ ] D9 Po utworzeniu przejście do treningu; trening staje się aktywny
- [ ] D10 Błąd utworzenia: komunikat i odblokowanie
- [ ] D11 Przy aktywnym treningu przycisk prowadzi do niego zamiast otwierać arkusz
- [ ] D12 Tworzenie działa offline

## E. Ekran treningu: aktywny (1)

- [ ] E1 Górny pasek: wróć, nazwa lub „Trening”, data z godziną
- [ ] E2 Przycisk edycji otwiera modal szczegółów
- [ ] E3 „Usuń trening” z potwierdzeniem i powrotem do listy
- [ ] E4 Karta „Czas trwania” z licznikiem MM:SS tykającym co sekundę
- [ ] E5 Licznik poprawny po zablokowaniu ekranu, tle i zabiciu apki
- [ ] E6 Reguła porzuconego treningu (2 h) w liczniku
- [ ] E7 Etykieta siłowni
- [ ] E8 Przycisk „Notatki” i karta „Notatki do treningu”
- [ ] E9 Znacznik „Plan {zrobione}/{wszystkie}”
- [ ] E10 Baner „Kolejne z planu” z dodaniem ćwiczenia
- [ ] E11 „Pomiń” ćwiczenie z planu (także offline; naprawa B4)
- [ ] E12 „Wszystkie ćwiczenia z planu zostały dodane”
- [ ] E13 Algorytm następnego ćwiczenia: kolejność planu, bez dodanych i pominiętych
- [ ] E14 Przyciski „Dodaj ćwiczenie” i „Zakończ trening”
- [ ] E15 Stan „Brak ćwiczeń w tej sesji” z podpowiedzią
- [ ] E16 Zakończenie: blokada bez ćwiczeń (tekst)
- [ ] E17 Zakończenie: blokada przy ćwiczeniu bez serii (tekst z nazwą)
- [ ] E18 Zakończenie: wysyła czas z licznika, wraca do listy, czyści aktywny trening
- [ ] E19 Zakończenie: błąd „Nie udało się zapisać treningu”
- [ ] E20 Stan ładowania i błędu ekranu
- [ ] E21 Trening usunięty gdzie indziej: komunikat i powrót

## F. Karta ćwiczenia w treningu (1.6–1.8)

- [ ] F1 Nagłówek: numer, nazwa z ucinaniem, etykiety grup, licznik serii
- [ ] F2 Notatka przeniesiona „Uwaga: "…"”
- [ ] F3 Przycisk zdjęcia (gdy są zdjęcia)
- [ ] F4 „Usuń ćwiczenie” z potwierdzeniem
- [ ] F5 Rozwijanie: jedna karta naraz, obrót strzałki
- [ ] F6 „Ostatnio” z seriami poprzedniego treningu (także niezakończonego)
- [ ] F7 „Ostatnio” ze statystyk, gdy brak poprzedniego treningu
- [ ] F8 „Rekord”
- [ ] F9 „Brak zapisanych serii.”
- [ ] F10 Wiersz serii: numer, ciężar, powtórzenia, przyciski edycji i usunięcia
- [ ] F11 Szkic otwiera się automatycznie dla ćwiczenia bez serii
- [ ] F12 Zwinięcie karty kasuje szkic
- [ ] F13 Wartości domyślne szkicu automatycznego (poprzednia seria o tym numerze → statystyki → 0/1)
- [ ] F14 Wartości domyślne po „+ Dodaj serię” (ostatnia seria → poprzedni trening → statystyki → 0/1)
- [ ] F15 „+ Dodaj serię” nieaktywny przy otwartym szkicu
- [ ] F16 Numer serii = największy numer + 1
- [ ] F17 Walidacja serii i komunikat; pusty ciężar = 0
- [ ] F18 Klawiatura numeryczna z separatorem dziesiętnym dla ciężaru, bez separatora dla powtórzeń; krok 0,5
- [ ] F19 Zatwierdzenie z klawiatury
- [ ] F20 Anulowanie szkicu
- [ ] F21 Edycja serii: tylko zmienione pola, brak żądania bez zmian
- [ ] F22 Usunięcie serii z potwierdzeniem
- [ ] F23 Notatka ćwiczenia: otwarcie, edycja, „Zapisz notatkę”, „Anuluj”, „Ukryj notatki”
- [ ] F24 Notatka ćwiczenia: wyświetlanie i edycja kliknięciem
- [ ] F25 Notatka ćwiczenia: pusta treść czyści notatkę
- [ ] F26 Przeniesienie notatki do następnego treningu z tym ćwiczeniem (jednorazowe)
- [ ] F27 Seria zapisana lokalnie natychmiast, widoczna po restarcie apki

## G. Ekran treningu: zakończony (1.5)

- [ ] G1 Karta podsumowania: czas, data i godzina, siłownia, notatki
- [ ] G2 „Brak danych” dla treningu bez czasu
- [ ] G3 Serie tylko do odczytu
- [ ] G4 Przycisk „Edytuj szczegóły treningu” (ikona kalendarza)
- [ ] G5 Tryb edycji: przełączanie, ikona ptaszka, tytuły
- [ ] G6 Tryb edycji: dodawanie ćwiczeń, edycja i usuwanie serii, ćwiczeń, notatek
- [ ] G7 Zmiany w zakończonym treningu przeliczają statystyki
- [ ] G8 Usunięcie zakończonego treningu przelicza statystyki

## H. Modale treningu (1.10, 1.11, 3.3)

- [ ] H1 Notatki treningu: tytuł, pole, placeholder, zapis z przycięciem, błąd
- [ ] H2 Szczegóły treningu: pola nazwy, siłowni, daty (maksimum dziś)
- [ ] H3 Szczegóły zakończonego: godziny rozpoczęcia i zakończenia, „Czas całkowity”
- [ ] H4 Szczegóły zakończonego: wartości początkowe godzin; przejście przez północ
- [ ] H5 Szczegóły: zapis działa (naprawa B1) i przelicza kolejność w statystykach przy zmianie daty
- [ ] H6 Dialog porzuconego treningu: warunek, teksty, „Kontynuuj”, „Zakończ trening”
- [ ] H7 Dialog porzuconego treningu: raz na trening na uruchomienie apki
- [ ] H8 Dialog porzuconego treningu: czas = ostatnia aktywność − start

## I. Ćwiczenia (4)

- [ ] I1 Nagłówek „Twoja baza” / „Ćwiczenia”, przycisk „Nowe ćwiczenie”
- [ ] I2 Wyszukiwarka z czyszczeniem
- [ ] I3 Wyszukiwanie rozmyte: polskie znaki, tolerancja literówek, dowolna kolejność słów
- [ ] I4 Sortowanie A → Z / Z → A wg polskiego alfabetu
- [ ] I5 Filtr „Wykonywane” z wyróżnieniem kart
- [ ] I6 Filtr „Ze zdjęciem”
- [ ] I7 Filtr „Moje własne”
- [ ] I8 Rząd grup mięśniowych: 20 grup w kolejności, jedna wybrana, odznaczanie
- [ ] I9 Łączenie filtrów
- [ ] I10 Widoczność: globalne i własne
- [ ] I11 Karta: nazwa, ikona własnego, etykiety, opis (2 linie), „Ostatnio” i „Rekord”
- [ ] I12 Karta: „Edytuj” i „Usuń” tylko dla twórcy lub admina
- [ ] I13 Stan ładowania i „Nie znaleziono ćwiczeń”
- [ ] I14 Usuwanie z potwierdzeniem; błąd
- [ ] I15 Usunięcie ćwiczenia usuwa je z historii treningów, planów i statystyk (jak backend)
- [ ] I16 Modal wyboru: arkusz 90%, tytuł, zamknięcie, „Dodaj nowe ćwiczenie”
- [ ] I17 Modal wyboru: wykluczenie już dodanych; „Wszystkie ćwiczenia zostały już dodane”
- [ ] I18 Modal wyboru: wybór dodaje ćwiczenie i zamyka; klawiatura się chowa
- [ ] I19 Nowe ćwiczenie: pola, placeholdery, dynamiczna lista grup bez powtórzeń
- [ ] I20 Nowe ćwiczenie: walidacje i ich kolejność
- [ ] I21 Nowe ćwiczenie: „Dodawanie...”, blokada pól, błąd zapisu
- [ ] I22 Nowe ćwiczenie: działa offline i jest od razu używalne w treningu i planie
- [ ] I23 Edycja ćwiczenia: pola wypełnione, walidacja, „Zapisz zmiany”
- [ ] I24 Zdjęcie ćwiczenia: modal z tytułem, etykiety etapów przy wielu zdjęciach
- [ ] I25 Zdjęcia dostępne offline po pierwszym pobraniu
- [ ] I26 Admin: przełącznik „Globalne ćwiczenie” ze znaczkiem
- [ ] I27 Admin: edycja i usuwanie cudzych i globalnych ćwiczeń

## J. Plany (5)

- [ ] J1 Nagłówek, podpowiedź o gwiazdce, „Stwórz nowy plan”
- [ ] J2 Cztery zakładki i ich zawartość; domyślnie „Ulubione”
- [ ] J3 Wyszukiwarka rozmyta z czyszczeniem
- [ ] J4 „Sortuj”: cztery opcje, domyślnie A–Z
- [ ] J5 Puste stany czterech zakładek
- [ ] J6 Karta: nazwa, liczba ćwiczeń z odmianą, „• Publiczny”, do trzech grup
- [ ] J7 Karta: rozwijana lista ćwiczeń
- [ ] J8 „Edytuj” i „Usuń” tylko dla uprawnionych
- [ ] J9 „Duplikuj do moich” dla cudzych i wbudowanych; „Kopiowanie…”; nazwa „(kopia)”, „(kopia 2)”
- [ ] J10 Gwiazdka ulubionych; ulubione pojawiają się w wyborze planu treningu
- [ ] J11 Usunięcie z potwierdzeniem; treningi tracą powiązanie z planem
- [ ] J12 Formularz: nagłówek nowy / edycja, „Anuluj”
- [ ] J13 Formularz: nazwa (limit 100), nazwa skrócona (limit 50) z podpowiedzią
- [ ] J14 Formularz: przełącznik „Publiczny plan”
- [ ] J15 Formularz: licznik „Ćwiczenia (n/50)”, dodawanie przez modal wyboru
- [ ] J16 Formularz: zmiana kolejności przeciąganiem
- [ ] J17 Formularz: usuwanie ćwiczenia z planu
- [ ] J18 Formularz: pięć walidacji w kolejności
- [ ] J19 Formularz: zapis, „Zapisywanie...”, błąd z powodem z serwera (naprawa B3)
- [ ] J20 Formularz: szkic przetrwa wyjście do „Nowe ćwiczenie”
- [ ] J21 Plan publiczny tylko z ćwiczeń globalnych (lokalnie i na serwerze)
- [ ] J22 Unikalność nazwy planu w obrębie konta
- [ ] J23 Historia: lista wersji, „Aktualna”, daty, „Wersja początkowa”
- [ ] J24 Historia: sześć typów zmian ze znakami i tekstami
- [ ] J25 Historia: wykrywanie przesunięć (najdłuższy zachowany podciąg)
- [ ] J26 Historia: rozwinięcie pełnej listy ćwiczeń wersji
- [ ] J27 Plany edytowalne offline (D3); zmiana odrzucona przez serwer widoczna z możliwością poprawy
- [ ] J28 Admin: „Globalny plan treningowy”, edycja i usuwanie planów wbudowanych

## K. Statystyki (6)

- [ ] K1 Nagłówek i trzy kafle (miesiąc, rok, serie)
- [ ] K2 Przełącznik „Rekordy” / „Aktualne” z tytułami
- [ ] K3 Lista rekordów: sortowanie malejąco, format liczby z przecinkiem
- [ ] K4 Lista aktualnych: pierwsza seria najnowszego treningu, „—” i przygaszenie bez danych
- [ ] K5 Stan pusty
- [ ] K6 Szczegóły: nagłówek, cztery kafle
- [ ] K7 Wykres: geometria, etykiety osi, daty skrajne, punkty i linia
- [ ] K8 Wykres: stan pusty i pojedynczy punkt
- [ ] K9 „Ostatnie sesje”: 8 najnowszych, przełącznik kolejności, serie treningu
- [ ] K10 Stan „Brak historii dla tego ćwiczenia.”
- [ ] K11 Statystyki liczone lokalnie dają wynik identyczny z serwerem (test porównujący na danych z seeda)
- [ ] K12 Statystyki aktualizują się offline po zakończeniu treningu
- [ ] K13 Kolejność przy tym samym dniu rozstrzygana jak na serwerze (`createdAt`)

## L. Ustawienia (8.3)

- [ ] L1 Nagłówek „Ustawienia” / „Profil i opcje”, karta profilu
- [ ] L2 Wybór motywu: arkusz, zakładki „Ciemne” / „Jasne”, podglądy, znacznik aktywnego
- [ ] L3 12 motywów z poprawnymi paletami; zmiana natychmiastowa
- [ ] L4 Motyw zapamiętany na urządzeniu, także po wylogowaniu
- [ ] L5 „Odśwież pamięć podręczną”: potwierdzenie, komunikaty, bez utraty niewysłanych zmian (naprawa B6)
- [ ] L6 „Wyloguj się” z ostrzeżeniem przy niewysłanych zmianach (odstępstwo)
- [ ] L7 Stopka z wersją
- [ ] L8 Usuwanie konta (D4): potwierdzenie hasłem, usunięcie danych, wylogowanie

## M. Banery i stan synchronizacji (8.4)

- [ ] M1 Baner offline z tekstem z PWA
- [ ] M2 Liczba oczekujących zmian (dodatek wymagany zleceniem)
- [ ] M3 Informacja o zmianach odrzuconych przez serwer z opisem „{akcja} {obiekt}”, „Ponów”, „Zamknij”
- [ ] M4 Baner nowej wersji: brak odpowiednika (odstępstwo)

## N. Offline i synchronizacja (zlecenie, sekcja 6.8)

- [ ] N1 Cały trening w trybie samolotowym, potem synchronizacja; trening widoczny w PWA z poprawnym czasem
- [ ] N2 Zabicie apki w połowie treningu i wznowienie
- [ ] N3 Utrata sieci w trakcie wysyłki, ponowienie bez duplikatów
- [ ] N4 Ta sama paczka wysłana dwukrotnie
- [ ] N5 Edycja tego samego rekordu w apce i w PWA
- [ ] N6 Trening rozpoczęty offline przy aktywnym treningu w PWA
- [ ] N7 Długi okres offline z wieloma zmianami
- [ ] N8 Wygaśnięcie sesji offline i ponowne logowanie z niepustą kolejką
- [ ] N9 Zmiana planu offline odrzucona przez serwer
- [ ] N10 Usunięcie w PWA rekordu, do którego apka ma zmiany w kolejce
- [ ] N11 Trening z PWA widoczny w apce po synchronizacji
- [ ] N12 Pobieranie przyrostowe po pierwszym pełnym
- [ ] N13 Aktualizacja apki nie kasuje lokalnej bazy

## O. Wygląd i zachowanie natywne

- [ ] O1 Fonty DM Sans i Barlow w tych samych wagach; cyfry tabelaryczne
- [ ] O2 Ikony z tych samych ścieżek SVG
- [ ] O3 Każdy ekran ze wzorca porównany w motywie `dark`
- [ ] O4 Każdy ekran ze wzorca porównany w motywie `light`
- [ ] O5 Lista treningów i trening aktywny porównane we wszystkich 12 motywach
- [ ] O6 Gradient i poświata przycisku głównego
- [ ] O7 Rozmycie pod dolnym paskiem i modalami
- [ ] O8 Safe area: notch, Dynamic Island, pasek gestów
- [ ] O9 Klawiatura nie zasłania aktywnego pola; arkusze reagują na klawiaturę
- [ ] O10 Natywne alerty z tekstami z PWA
- [ ] O11 Haptyka przy zapisie serii, zakończeniu treningu, przełącznikach
- [ ] O12 Gest cofania iOS i przycisk wstecz Androida
- [ ] O13 Czytniki ekranu: etykiety z `aria-label` i `title` PWA
- [ ] O14 Systemowy rozmiar czcionki nie rozbija układu
- [ ] O15 Elementy dotykowe minimum 44 px

## P. Live Activity i powiadomienie (zlecenie, sekcja 7)

- [ ] P1 iOS: start przy rozpoczęciu treningu, koniec przy zakończeniu i usunięciu
- [ ] P2 iOS: ekran blokady i Dynamic Island z czasem, nazwą, ćwiczeniem i seriami
- [ ] P3 iOS: czas tyka bez działającej apki
- [ ] P4 iOS: aktualizacja po zapisie serii i zmianie ćwiczenia
- [ ] P5 Android: stałe powiadomienie z tym samym zakresem i licznikiem
- [ ] P6 Android: działa przy zablokowanym ekranie i w tle (także Xiaomi)
- [ ] P7 Zachowanie przy porzuconym treningu
- [ ] P8 Trening zakończony w PWA zamyka aktywność przy synchronizacji
