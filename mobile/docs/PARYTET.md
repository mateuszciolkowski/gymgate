# Lista kontrolna parytetu

Każda pozycja to funkcja lub stan PWA, który apka musi odtworzyć. Opis zachowania: `INWENTARYZACJA.md` (numer sekcji w nawiasie). Pozycję odhaczamy dopiero po sprawdzeniu w apce, z notatką o sposobie weryfikacji: `[x] … — test jednostkowy / E2E / zrzut vs wzorzec / ręcznie na symulatorze`.

Oznaczenia: `[ ]` do zrobienia, `[x]` zweryfikowane, `[~]` zrobione, niezweryfikowane na urządzeniu, `[o]` świadome odstępstwo (wpis w `DECYZJE.md`).

Stan: 166 z 243 pozycji zweryfikowanych.

## A. Start, logowanie, rejestracja, sesja (7)

- [~] A1 Ekran ładowania sesji: spinner i „Ładowanie...” — stan zbyt krótki, by go zobaczyć
- [x] A2 Logowanie: układ, pola, placeholdery, przycisk i jego stan „Logowanie...” — zrzut vs wzorzec (wg raportu agenta)
- [~] A3 Logowanie: blokada pól w trakcie — stan zbyt krótki, by go zobaczyć
- [x] A4 Logowanie: błąd „Nieprawidłowy email lub hasło” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A5 Logowanie: błąd limitu prób „Zbyt wiele prób. Spróbuj ponownie później.” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A6 Logowanie: czytelny komunikat przy braku sieci (odstępstwo od surowego błędu przeglądarki) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A7 Logowanie: walidacja pól wymaganych, formatu e-mail i minimalnej długości hasła — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A8 Przejście logowanie ↔ rejestracja — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [~] A9 Rejestracja: układ, sześć pól, placeholdery, stan „Tworzenie konta...” — układ: zrzut vs wzorzec; „Tworzenie konta...” niewidziane
- [x] A10 Rejestracja: „Hasła nie są identyczne” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A11 Rejestracja: „Hasło musi mieć minimum 6 znaków” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A12 Rejestracja: imię i nazwisko minimum 2 znaki (teksty serwera, walidacja lokalna) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A13 Rejestracja: „Nieprawidłowy email” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A14 Rejestracja: „Użytkownik z tym emailem już istnieje” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [~] A15 Rejestracja: pusty telefon nie jest wysyłany — wiersz w bazie bez telefonu, NULL niepotwierdzony
- [x] A16 Rejestracja: automatyczne zalogowanie po sukcesie — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A17 Sesja przetrwa restart apki; apka otwiera się od razu z danych lokalnych — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A18 Weryfikacja sesji w tle; wylogowanie tylko przy jawnym odrzuceniu (401/403) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [~] A19 Brak sieci i błędy 5xx nie wylogowują — brak sieci w Maestro (zatrzymany backend); 5xx tylko test jednostkowy
- [~] A20 Istniejące konto z PWA loguje się i widzi wszystkie swoje dane — konto z seeda; bez porównania z danymi utworzonymi w PWA
- [x] A21 Wylogowanie z szuflady i z ustawień — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] A22 Dane lokalne rozdzielone per konto (naprawa B7) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)

## B. Nawigacja i szkielet (8.1, 8.2, 3.1)

- [x] B1 Ekran startowy: Treningi — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [~] B2 Dolny pasek: trzy zakładki z ikonami, stan aktywny (tło, kolor, grubość kreski) — widoczne w Maestro i na zrzutach, bez dokładnego porównania
- [x] B3 Dolny pasek: przycisk szuflady — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] B4 Dolny pasek: „Nowy trening” bez aktywnego treningu — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] B5 Dolny pasek: pastylka z licznikiem przy aktywnym treningu, prowadzi do treningu — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [ ] B6 Dolny pasek: żadna zakładka nie jest aktywna na ekranie treningu
- [~] B7 Dolny pasek: pływający, rozmyte tło, margines bezpieczny od dołu — widoczne w Maestro i na zrzutach, bez dokładnego porównania
- [~] B8 Szuflada: otwarcie przyciskiem, zamknięcie przyciskiem i tłem — przycisk w Maestro; dotknięcie tła niesprawdzone
- [~] B9 Szuflada: gest otwarcia od krawędzi i zamknięcia przeciągnięciem, progi 35% / 30% — progi w teście jednostkowym; gest niesprawdzony na symulatorze
- [x] B10 Szuflada: profil z inicjałami, imieniem, nazwiskiem, e-mailem — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] B11 Szuflada: pięć pozycji, wyróżnienie aktywnej, przejście i zamknięcie — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] B12 Szuflada: „Wyloguj się”, „GymGate v1.0.0” — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [ ] B13 Ekrany podrzędne na natywnym stosie z gestem cofania
- [x] B14 Powrót z „Nowe ćwiczenie” do treningu z automatycznym dodaniem ćwiczenia — Maestro na symulatorze iOS (Etapy 7–8, wg raportów agentów)
- [x] B15 Powrót z „Nowe ćwiczenie” do formularza planu z zachowanym szkicem i dopisanym ćwiczeniem — Maestro na symulatorze iOS (Etapy 7–8, wg raportów agentów)
- [x] B16 Powrót z „Nowe ćwiczenie” do listy ćwiczeń — Maestro na symulatorze iOS (Etapy 7–8, wg raportów agentów)
- [ ] B17 Zniknięcie otwartego treningu wraca do listy
- [ ] B18 Animacja wejścia ekranu zastąpiona natywnym przejściem; ograniczenie ruchu respektowane

## C. Lista treningów (2)

- [x] C1 Nagłówek „Dziennik treningowy” / „Treningi” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] C2 Pasek aktywności: liczba treningów (ostatnie 12 miesięcy) i serii, znacznik „Aktywność” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] C3 Pasek aktywności: wartości zastępcze bez podsumowania — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] C4 Sekcja „Trening w toku”: karta, teksty, przycisk „Wróć”, pulsująca kropka — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] C5 Sekcja „Trening w toku”: więcej niż jeden trening DRAFT — zbudowane, w danych testowych tylko jeden DRAFT
- [x] C6 „Historia sesji” z licznikiem — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] C7 Sortowanie „Od najnowszych” / „Od najstarszych” (widoczne przy więcej niż jednym) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] C8 Karta treningu: nazwa lub „Trening”, czas, data, siłownia, liczba ćwiczeń i serii — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [ ] C9 Stan ładowania „Ładowanie sesji...”
- [ ] C10 Stan pusty „Brak ukończonych treningów”
- [ ] C11 Płynne przewijanie długiej historii (setki treningów)

## D. Nowy trening (2.3)

- [x] D1 Arkusz: tytuł, podtytuł, uchwyt, zamknięcie tłem — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D2 Pola nazwy i siłowni z placeholderami — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D3 Data: domyślnie dziś, maksimum dziś, format wyświetlania, natywny wybór — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D4 Wybór planu: widoczny tylko przy planach ulubionych lub wbudowanych — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D5 Wybór planu: „Zacznij bez planu”, ulubione pierwsze ze znacznikiem, liczba ćwiczeń — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D6 Wybór planu wpisuje nazwę skróconą wg reguły (puste pole lub nazwa poprzedniego planu) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D7 „Rozpocznij” / „Tworzenie…”, blokada podwójnego wysłania — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D8 Data z bieżącą godziną jako `workoutDate` — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D9 Po utworzeniu przejście do treningu; trening staje się aktywny — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D10 Błąd utworzenia: komunikat i odblokowanie — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D11 Przy aktywnym treningu przycisk prowadzi do niego zamiast otwierać arkusz — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] D12 Tworzenie działa offline — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)

## E. Ekran treningu: aktywny (1)

- [x] E1 Górny pasek: wróć, nazwa lub „Trening”, data z godziną — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E2 Przycisk edycji otwiera modal szczegółów — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E3 „Usuń trening” z potwierdzeniem i powrotem do listy — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E4 Karta „Czas trwania” z licznikiem MM:SS tykającym co sekundę — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] E5 Licznik poprawny po zablokowaniu ekranu, tle i zabiciu apki — tło i zabicie apki sprawdzone w Maestro; blokada ekranu nie
- [x] E6 Reguła porzuconego treningu (2 h) w liczniku — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E7 Etykieta siłowni — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E8 Przycisk „Notatki” i karta „Notatki do treningu” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E9 Znacznik „Plan {zrobione}/{wszystkie}” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E10 Baner „Kolejne z planu” z dodaniem ćwiczenia — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E11 „Pomiń” ćwiczenie z planu (także offline; naprawa B4) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E12 „Wszystkie ćwiczenia z planu zostały dodane” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E13 Algorytm następnego ćwiczenia: kolejność planu, bez dodanych i pominiętych — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E14 Przyciski „Dodaj ćwiczenie” i „Zakończ trening” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E15 Stan „Brak ćwiczeń w tej sesji” z podpowiedzią — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] E16 Zakończenie: blokada bez ćwiczeń (tekst) — test jednostkowy
- [x] E17 Zakończenie: blokada przy ćwiczeniu bez serii (tekst z nazwą) — test jednostkowy
- [x] E18 Zakończenie: wysyła czas z licznika, wraca do listy, czyści aktywny trening — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] E19 Zakończenie: błąd „Nie udało się zapisać treningu” — ścieżka błędu niewywołana
- [~] E20 Stan ładowania i błędu ekranu — ścieżka błędu niewywołana
- [x] E21 Trening usunięty gdzie indziej: komunikat i powrót — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)

## F. Karta ćwiczenia w treningu (1.6–1.8)

- [x] F1 Nagłówek: numer, nazwa z ucinaniem, etykiety grup, licznik serii — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F2 Notatka przeniesiona „Uwaga: "…"” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] F3 Przycisk zdjęcia (gdy są zdjęcia) — test jednostkowy; brak zdjęć w danych
- [x] F4 „Usuń ćwiczenie” z potwierdzeniem — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F5 Rozwijanie: jedna karta naraz, obrót strzałki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F6 „Ostatnio” z seriami poprzedniego treningu (także niezakończonego) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F7 „Ostatnio” ze statystyk, gdy brak poprzedniego treningu — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F8 „Rekord” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F9 „Brak zapisanych serii.” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F10 Wiersz serii: numer, ciężar, powtórzenia, przyciski edycji i usunięcia — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [o] F11 Szkic otwiera się automatycznie dla ćwiczenia bez serii — D-49
- [x] F12 Zwinięcie karty kasuje szkic — test jednostkowy
- [x] F13 Wartości domyślne szkicu automatycznego (poprzednia seria o tym numerze → statystyki → 0/1) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F14 Wartości domyślne po „+ Dodaj serię” (ostatnia seria → poprzedni trening → statystyki → 0/1) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F15 „+ Dodaj serię” nieaktywny przy otwartym szkicu — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [ ] F16 Numer serii = największy numer + 1
- [x] F17 Walidacja serii i komunikat; pusty ciężar = 0 — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F18 Klawiatura numeryczna z separatorem dziesiętnym dla ciężaru, bez separatora dla powtórzeń; krok 0,5 — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F19 Zatwierdzenie z klawiatury — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F20 Anulowanie szkicu — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F21 Edycja serii: tylko zmienione pola, brak żądania bez zmian — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F22 Usunięcie serii z potwierdzeniem — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F23 Notatka ćwiczenia: otwarcie, edycja, „Zapisz notatkę”, „Anuluj”, „Ukryj notatki” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F24 Notatka ćwiczenia: wyświetlanie i edycja kliknięciem — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F25 Notatka ćwiczenia: pusta treść czyści notatkę — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F26 Przeniesienie notatki do następnego treningu z tym ćwiczeniem (jednorazowe) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] F27 Seria zapisana lokalnie natychmiast, widoczna po restarcie apki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)

## G. Ekran treningu: zakończony (1.5)

- [x] G1 Karta podsumowania: czas, data i godzina, siłownia, notatki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] G2 „Brak danych” dla treningu bez czasu — tylko kod
- [x] G3 Serie tylko do odczytu — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] G4 Przycisk „Edytuj szczegóły treningu” (ikona kalendarza) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] G5 Tryb edycji: przełączanie, ikona ptaszka, tytuły — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] G6 Tryb edycji: dodawanie ćwiczeń, edycja i usuwanie serii, ćwiczeń, notatek — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] G7 Zmiany w zakończonym treningu przeliczają statystyki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] G8 Usunięcie zakończonego treningu przelicza statystyki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)

## H. Modale treningu (1.10, 1.11, 3.3)

- [x] H1 Notatki treningu: tytuł, pole, placeholder, zapis z przycięciem, błąd — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] H2 Szczegóły treningu: pola nazwy, siłowni, daty (maksimum dziś) — test jednostkowy
- [x] H3 Szczegóły zakończonego: godziny rozpoczęcia i zakończenia, „Czas całkowity” — test jednostkowy
- [x] H4 Szczegóły zakończonego: wartości początkowe godzin; przejście przez północ — test jednostkowy
- [~] H5 Szczegóły: zapis działa (naprawa B1) i przelicza kolejność w statystykach przy zmianie daty — nazwa i siłownia sprawdzone w Maestro; zmiana daty nie
- [x] H6 Dialog porzuconego treningu: warunek, teksty, „Kontynuuj”, „Zakończ trening” — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] H7 Dialog porzuconego treningu: raz na trening na uruchomienie apki — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] H8 Dialog porzuconego treningu: czas = ostatnia aktywność − start — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)

## I. Ćwiczenia (4)

- [x] I1 Nagłówek „Twoja baza” / „Ćwiczenia”, przycisk „Nowe ćwiczenie” — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I2 Wyszukiwarka z czyszczeniem — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I3 Wyszukiwanie rozmyte: polskie znaki, tolerancja literówek, dowolna kolejność słów — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I4 Sortowanie A → Z / Z → A wg polskiego alfabetu — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [~] I5 Filtr „Wykonywane” z wyróżnieniem kart — test jednostkowy filtra; wyróżnienie kart niewidziane na ekranie
- [~] I6 Filtr „Ze zdjęciem” — test jednostkowy; brak zdjęć w danych
- [x] I7 Filtr „Moje własne” — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I8 Rząd grup mięśniowych: 20 grup w kolejności, jedna wybrana, odznaczanie — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I9 Łączenie filtrów — test jednostkowy/komponentu
- [x] I10 Widoczność: globalne i własne — test jednostkowy/komponentu
- [x] I11 Karta: nazwa, ikona własnego, etykiety, opis (2 linie), „Ostatnio” i „Rekord” — zrzut vs wzorzec (wg raportu agenta)
- [x] I12 Karta: „Edytuj” i „Usuń” tylko dla twórcy lub admina — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I13 Stan ładowania i „Nie znaleziono ćwiczeń” — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I14 Usuwanie z potwierdzeniem; błąd — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I15 Usunięcie ćwiczenia usuwa je z historii treningów, planów i statystyk (jak backend) — test jednostkowy/komponentu
- [x] I16 Modal wyboru: arkusz 90%, tytuł, zamknięcie, „Dodaj nowe ćwiczenie” — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I17 Modal wyboru: wykluczenie już dodanych; „Wszystkie ćwiczenia zostały już dodane” — test jednostkowy/komponentu
- [x] I18 Modal wyboru: wybór dodaje ćwiczenie i zamyka; klawiatura się chowa — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I19 Nowe ćwiczenie: pola, placeholdery, dynamiczna lista grup bez powtórzeń — zrzut vs wzorzec + test komponentu (wg raportu agenta)
- [x] I20 Nowe ćwiczenie: walidacje i ich kolejność — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [~] I21 Nowe ćwiczenie: „Dodawanie...”, blokada pól, błąd zapisu — błąd zapisu w teście komponentu; stan „Dodawanie...” nieobserwowalny (zapis natychmiastowy)
- [x] I22 Nowe ćwiczenie: działa offline i jest od razu używalne w treningu i planie — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [x] I23 Edycja ćwiczenia: pola wypełnione, walidacja, „Zapisz zmiany” — Maestro na symulatorze iOS (Etap 7, wg raportu agenta)
- [~] I24 Zdjęcie ćwiczenia: modal z tytułem, etykiety etapów przy wielu zdjęciach — brak zdjęć w danych testowych
- [~] I25 Zdjęcia dostępne offline po pierwszym pobraniu — pamięć dyskowa expo-image, niesprawdzone
- [~] I26 Admin: przełącznik „Globalne ćwiczenie” ze znaczkiem — test komponentu; brak konta admina na symulatorze
- [x] I27 Admin: edycja i usuwanie cudzych i globalnych ćwiczeń — test jednostkowy/komponentu

## J. Plany (5)

- [x] J1 Nagłówek, podpowiedź o gwiazdce, „Stwórz nowy plan” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J2 Cztery zakładki i ich zawartość; domyślnie „Ulubione” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J3 Wyszukiwarka rozmyta z czyszczeniem — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J4 „Sortuj”: cztery opcje, domyślnie A–Z — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J5 Puste stany czterech zakładek — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J6 Karta: nazwa, liczba ćwiczeń z odmianą, „• Publiczny”, do trzech grup — zrzut vs wzorzec + test komponentu (wg raportu agenta)
- [x] J7 Karta: rozwijana lista ćwiczeń — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J8 „Edytuj” i „Usuń” tylko dla uprawnionych — test jednostkowy/komponentu
- [x] J9 „Duplikuj do moich” dla cudzych i wbudowanych; „Kopiowanie…”; nazwa „(kopia)”, „(kopia 2)” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J10 Gwiazdka ulubionych; ulubione pojawiają się w wyborze planu treningu — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J11 Usunięcie z potwierdzeniem; treningi tracą powiązanie z planem — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J12 Formularz: nagłówek nowy / edycja, „Anuluj” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J13 Formularz: nazwa (limit 100), nazwa skrócona (limit 50) z podpowiedzią — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J14 Formularz: przełącznik „Publiczny plan” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J15 Formularz: licznik „Ćwiczenia (n/50)”, dodawanie przez modal wyboru — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J16 Formularz: zmiana kolejności przeciąganiem — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J17 Formularz: usuwanie ćwiczenia z planu — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J18 Formularz: pięć walidacji w kolejności — test jednostkowy/komponentu
- [~] J19 Formularz: zapis, „Zapisywanie...”, błąd z powodem z serwera (naprawa B3) — zapis w teście komponentu; „Zapisywanie...” nieobserwowalne (zapis natychmiastowy)
- [x] J20 Formularz: szkic przetrwa wyjście do „Nowe ćwiczenie” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J21 Plan publiczny tylko z ćwiczeń globalnych (lokalnie i na serwerze) — test jednostkowy/komponentu
- [~] J22 Unikalność nazwy planu w obrębie konta — test komponentu; odrzucenie przez serwer niesprawdzone
- [x] J23 Historia: lista wersji, „Aktualna”, daty, „Wersja początkowa” — Maestro na symulatorze iOS (Etap 8, wg raportu agenta)
- [x] J24 Historia: sześć typów zmian ze znakami i tekstami — test jednostkowy/komponentu
- [x] J25 Historia: wykrywanie przesunięć (najdłuższy zachowany podciąg) — test jednostkowy/komponentu
- [~] J26 Historia: rozwinięcie pełnej listy ćwiczeń wersji — rozwinięcie karty w Maestro, bez zrzutu
- [~] J27 Plany edytowalne offline (D3); zmiana odrzucona przez serwer widoczna z możliwością poprawy — tworzenie i edycja offline w Maestro; przyjęcie przez serwer wywnioskowane z pustej kolejki, baza nie była sprawdzana
- [~] J28 Admin: „Globalny plan treningowy”, edycja i usuwanie planów wbudowanych — test komponentu; brak konta admina na symulatorze

## K. Statystyki (6)

- [x] K1 Nagłówek i trzy kafle (miesiąc, rok, serie) — test komponentu + Maestro na symulatorze iOS (Etap 10, wg raportu agenta)
- [x] K2 Przełącznik „Rekordy” / „Aktualne” z tytułami — test komponentu + Maestro na symulatorze iOS (Etap 10, wg raportu agenta)
- [x] K3 Lista rekordów: sortowanie malejąco, format liczby z przecinkiem — test komponentu + zrzut vs wzorzec (wg raportu agenta; zrzut 52 obejrzany przez orkiestratora)
- [~] K4 Lista aktualnych: pierwsza seria najnowszego treningu, „—” i przygaszenie bez danych — reguła pierwszej serii w teście jednostkowym; „—” i przygaszenie bez testu
- [x] K5 Stan pusty — test jednostkowy/komponentu
- [x] K6 Szczegóły: nagłówek, cztery kafle — test komponentu + zrzut vs wzorzec (wg raportu agenta; zrzut 52 obejrzany przez orkiestratora)
- [x] K7 Wykres: geometria, etykiety osi, daty skrajne, punkty i linia — zrzut vs wzorzec, dark i light (wg raportu agenta; zrzut 52 obejrzany przez orkiestratora)
- [~] K8 Wykres: stan pusty i pojedynczy punkt — test komponentu tylko sprawdza, że wykres się renderuje
- [x] K9 „Ostatnie sesje”: 8 najnowszych, przełącznik kolejności, serie treningu — test komponentu + Maestro na symulatorze iOS (Etap 10, wg raportu agenta)
- [x] K10 Stan „Brak historii dla tego ćwiczenia.” — test jednostkowy/komponentu
- [~] K11 Statystyki liczone lokalnie dają wynik identyczny z serwerem (test porównujący na danych z seeda) — test:parity nieuruchomiony w tym etapie; nowe funkcje to porty logiki PWA bez odpowiednika na serwerze
- [~] K12 Statystyki aktualizują się offline po zakończeniu treningu — odczyt przez żywe zapytanie; bez testu offline
- [x] K13 Kolejność przy tym samym dniu rozstrzygana jak na serwerze (`createdAt`) — test jednostkowy/komponentu

## L. Ustawienia (8.3)

- [x] L1 Nagłówek „Ustawienia” / „Profil i opcje”, karta profilu — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] L2 Wybór motywu: arkusz, zakładki „Ciemne” / „Jasne”, podglądy, znacznik aktywnego — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [~] L3 12 motywów z poprawnymi paletami; zmiana natychmiastowa — 12 motywów w teście; na symulatorze przełączono tylko sand, light, dark
- [x] L4 Motyw zapamiętany na urządzeniu, także po wylogowaniu — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] L5 „Odśwież pamięć podręczną”: potwierdzenie, komunikaty, bez utraty niewysłanych zmian (naprawa B6) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] L6 „Wyloguj się” z ostrzeżeniem przy niewysłanych zmianach (odstępstwo) — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] L7 Stopka z wersją — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)
- [x] L8 Usuwanie konta (D4): potwierdzenie hasłem, usunięcie danych, wylogowanie — Maestro na symulatorze iOS (Etap 11, wg raportu agenta)

## M. Banery i stan synchronizacji (8.4)

- [x] M1 Baner offline z tekstem z PWA — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [x] M2 Liczba oczekujących zmian (dodatek wymagany zleceniem) — Maestro na symulatorze iOS + zrzut vs wzorzec (Etap 9, wg raportu agenta)
- [~] M3 Informacja o zmianach odrzuconych przez serwer z opisem „{akcja} {obiekt}”, „Ponów”, „Zamknij” — baner, szczegóły, „Odrzuć zmiany”, „Zamknij” w Maestro; „Ponów” tylko test jednostkowy
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

- [x] P1 iOS: start przy rozpoczęciu treningu, koniec przy zakończeniu i usunięciu — widziane na symulatorze iOS, zrzuty 90* (Etap 12, wg raportu agenta; 90d i 90e obejrzane przez orkiestratora)
- [x] P2 iOS: ekran blokady i Dynamic Island z czasem, nazwą, ćwiczeniem i seriami — widziane na symulatorze iOS, zrzuty 90* (Etap 12, wg raportu agenta; 90d i 90e obejrzane przez orkiestratora); widok minimalny niezłapany
- [x] P3 iOS: czas tyka bez działającej apki — widziane na symulatorze iOS, zrzuty 90* (Etap 12, wg raportu agenta; 90d i 90e obejrzane przez orkiestratora)
- [~] P4 iOS: aktualizacja po zapisie serii i zmianie ćwiczenia — po zapisie serii widziane na symulatorze; zmiana ćwiczenia tylko test jednostkowy
- [ ] P5 Android: stałe powiadomienie z tym samym zakresem i licznikiem — niezbudowane: tylko notatka projektowa, brak Android SDK
- [ ] P6 Android: działa przy zablokowanym ekranie i w tle (także Xiaomi) — niezbudowane, jak P5
- [~] P7 Zachowanie przy porzuconym treningu — stan „Trening wstrzymany” widziany dla treningu już porzuconego; przejście w trakcie uśpienia apki niewidziane
- [~] P8 Trening zakończony w PWA zamyka aktywność przy synchronizacji — z konstrukcji (żywe zapytanie do bazy), działa tylko gdy apka żyje; niesprawdzone
