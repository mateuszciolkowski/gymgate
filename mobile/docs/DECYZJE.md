# Rejestr decyzji

Decyzje podjęte samodzielnie w trakcie migracji oraz świadome odstępstwa od zachowania PWA. Decyzje właściciela (D1–D6) są w `MIGRACJA_MOBILE.md`, sekcja 0. Każdą pozycję właściciel może zmienić; do tego czasu obowiązuje.

Format: numer, data, decyzja, powód, skutek.

## Architektura

**D-01 (2026-11-15) Operacje domenowe zamiast różnic wierszy.** Outbox przechowuje operacje typu „dodaj serię”, a serwer wykonuje je przez istniejące reguły. Powód: statystyki, przenoszenie notatek i historia planów muszą działać identycznie dla apki i PWA. Skutek: nowy typ zmiany w apce wymaga nowej operacji po obu stronach.

**D-02 (2026-11-15) Osobne endpointy `/api/sync/*` i `/api/auth/mobile/*`.** Stare endpointy pozostają wyłącznie dla PWA i nie zmieniają kształtu. Powód: zasada ciągłości działania.

**D-03 (2026-11-15) Dziennik zmian zapisują wyzwalacze PostgreSQL, nie kod aplikacji.** Powód: zero zmian w istniejących ścieżkach zapisu, a dziennik obejmuje też zapisy PWA, kaskady i seedy. Ryzyko: błąd w wyzwalaczu przerwałby zapis PWA; ograniczone prostotą funkcji i testami integracyjnymi każdej tabeli. Wycofanie: usunięcie wyzwalaczy i tabeli, bez wpływu na dane.

**D-04 (2026-11-15) Kursor pobierania oparty na granicy migawki transakcji.** Powód: samo porównanie `updatedAt` albo numeru wpisu gubi zmiany zatwierdzone równolegle. Skutek: długo otwarta transakcja w bazie opóźnia (nie gubi) dostarczenie nowszych zmian.

**D-05 (2026-11-15) Statystyki liczone lokalnie, niepobierane z serwera.** Odstępstwo od zdania zlecenia „wynik serwera zastępuje lokalnie policzony”. Powód: jedno źródło prawdy na urządzeniu, natychmiastowa reakcja offline, brak migotania wartości po synchronizacji. Zabezpieczenie: test parytetu porównuje wyniki lokalne z endpointami statystyk na tych samych danych.

**D-06 (2026-11-15) Historia planu pozostaje pobierana na żądanie, z kopią offline.** Plany są edytowalne offline (D3), ale wersje historii tworzy serwer. Offline modal pokazuje ostatnio pobraną historię z adnotacją; zmiany niewysłane pojawią się w historii po synchronizacji.

**D-07 (2026-11-15) Bez NativeWind; typowany obiekt motywu.** Powód: PWA używa zmiennych CSS i wartości w pikselach w stylach inline, które mapują się 1:1 na obiekt motywu; mniej warstw i ryzyka przy 12 motywach.

**D-08 (2026-11-15) Gest szuflady tylko na ekranach zakładek.** Na ekranach podrzędnych lewa krawędź należy do systemowego gestu cofania iOS. W PWA szuflada otwiera się gestem wszędzie.

**D-09 (2026-11-15) Dolny pasek widoczny na ekranach podrzędnych.** Jak w PWA; realizowany jako nakładka nad natywnym stosem.

## Odstępstwa od zachowania PWA

**D-10 (2026-11-15) Potwierdzenie usunięcia ćwiczenia mówi o skutkach.** PWA pyta tylko „Czy na pewno chcesz usunąć ćwiczenie "{nazwa}"?”, a serwer kasuje je kaskadowo z historii treningów i planów. Apka dopisuje do pytania, w ilu treningach i planach ćwiczenie występuje. Powód: nieodwracalna utrata danych bez ostrzeżenia.

**D-11 (2026-11-15) Naprawa B1 po stronie backendu.** Edycja szczegółów treningu w PWA nie działa online, bo modal wysyła samą datę. Backend zacznie przyjmować zarówno pełny znacznik czasu, jak i samą datę. Zmiana zgodna wstecznie, naprawia produkcyjne PWA bez dotykania `frontend/`. Do potwierdzenia przez właściciela przed wdrożeniem (wchodzi w punkt kontrolny D2).

**D-12 (2026-11-15) Błędy planów pokazują powód z serwera** (naprawa B3).

**D-13 (2026-11-15) Pominięcie ćwiczenia z planu jest zwykłą operacją w kolejce** (naprawa B4).

**D-14 (2026-11-15) Wylogowanie i „Odśwież pamięć podręczną” nie gubią niewysłanych zmian** (naprawa B6): odświeżenie najpierw wysyła kolejkę; wylogowanie przy niepustej kolejce pyta użytkownika.

**D-15 (2026-11-15) Dane lokalne rozdzielone per konto** (naprawa B7).

**D-16 (2026-11-15) Jeden licznik czasu treningu.** Pastylka w dolnym pasku używa tej samej funkcji co ekran treningu, z regułą porzuconego treningu (naprawa B10).

**D-17 (2026-11-15) Poprawna odmiana liczebników.** „1 seria / 2 serie / 5 serii”, „1 ćwiczenie / 2 ćwiczenia / 5 ćwiczeń / 22 ćwiczenia”. PWA odmienia błędnie w kilku miejscach.

**D-18 (2026-11-15) Wyszukiwanie ćwiczeń dopasowuje polskie nazwy grup mięśniowych.** PWA dopasowuje angielskie wartości enum.

**D-19 (2026-11-15) Czytelny komunikat przy braku sieci na ekranie logowania** zamiast surowego błędu przeglądarki: „Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.”

**D-20 (2026-11-15) Walidacja imienia i nazwiska (min. 2 znaki) i formatu e-mail po stronie apki** z tekstami serwera. PWA pokazuje w tym przypadku ogólne „Validation failed”.

**D-21 (2026-11-15) Baner nowej wersji nie ma odpowiednika.** Aktualizacje apki dostarcza sklep.

**D-22 (2026-11-15) Brak pull-to-refresh.** PWA go nie ma (wyłącza gest przeglądarki); odświeżanie ręczne tylko z Ustawień, a synchronizacja w tle jest automatyczna.

**D-23 (2026-11-15) Pola da się wyczyścić.** Nazwa treningu, siłownia i opis ćwiczenia mogą zostać opróżnione (w PWA puste pole jest pomijane w żądaniu; B11).

**D-24 (2026-11-15) Dialog porzuconego treningu zachowuje się jak w PWA**, czyli pozwala zakończyć trening bez sprawdzania reguł zakończenia (B9). Powód: to ratunkowe zamknięcie zapomnianego treningu; blokada zmusiłaby użytkownika do sztucznego dodawania serii.

**D-25 (2026-11-15) Przy wielu wersjach tego samego czasu trwania zachowujemy formaty PWA** („1h 5min” na ekranie treningu, „1h 5m” na liście). Powód: parytet; ujednolicenie byłoby zmianą wyglądu bez zysku funkcjonalnego.

**D-26 (2026-11-15) Zakładka planów zachowuje nazwę „Built-in”.** Jak w PWA.

## Fundament apki (Etap 3)

**D-35 (2026-11-15) Node 24 dla `mobile/`.** Expo SDK 58 nie działa na Node 20; backend i frontend zostają na Node 20, CI apki używa 24.

**D-36 (2026-11-15) Wybór motywu zapisywany w `expo-sqlite/kv-store`**, bez dodatkowej biblioteki magazynu.

**D-37 (2026-11-15) Fonty z pakietów `@expo-google-fonts`.** `@fontsource` z PWA dostarcza tylko woff, a React Native wymaga TTF; kroje i wagi te same.

**D-38 (2026-11-15) Reguła ESLint `array-type` wyłączona**, żeby kod przenoszony z PWA (`Array<T>`) kopiować bez zmian.

**D-39 (2026-11-15) Ikona apki tymczasowo z `frontend/public/pwa-512x512.png`**; docelowa ikona i splash w Etapie 13.

## Backend: `pull`, sesje mobilne, usuwanie konta (zadania 4.5–4.8)

**D-40 (2026-11-15) `resyncRequired` według wieku kursora.** Kursor niesie czas wydania; starszy niż 90 dni wymusza pełne pobranie. Powód: numery wpisów dziennika mają naturalne luki, więc porównanie z najstarszym wpisem nie odróżnia luki od wyczyszczenia.

**D-41 (2026-11-15) Czyszczenie przy starcie serwera i co 24 h:** `sync_changes` i `sync_operations` starsze niż 90 dni, tokeny odświeżania wygasłe lub unieważnione ponad 30 dni temu.

**D-42 (2026-11-15) `refresh_tokens.familyId`.** Dodatkowa kolumna względem planu, potrzebna do unieważniania całej rodziny tokenów.

**D-43 (2026-11-15) Błędne hasło przy usuwaniu konta zwraca 403**, nie 401, bo klienci traktują 401 jako wygasłą sesję.

**D-44 (2026-11-15) Konta o identyfikatorze "1" nie da się usunąć** (403): jest właścicielem globalnego katalogu ćwiczeń, który zniknąłby kaskadowo.

**D-45 (2026-11-15) Powtórzone odświeżenie starym tokenem może zostawić dwa ważne następniki** do czasu wygaśnięcia. Przyjęte dla prostoty rotacji odpornej na zgubioną odpowiedź.

## Interfejs apki (zadania 3.5–3.6)

**D-46 (2026-11-15) Nagłówki w DM Sans, tak jak faktycznie renderuje je PWA.** Klasa `font-barlow` nie generuje w PWA żadnego CSS (Tailwind 4 pomija `tailwind.config.js`), więc tekst wyświetla się w DM Sans i tak wyglądają zrzuty wzorcowe. Apka odwzorowuje stan widoczny, nie zamierzony. Do decyzji właściciela: zostać przy parytecie czy przejść na prawdziwy Barlow.

**D-47 (2026-11-15) Tekst błędu pustego pola: „Wypełnij to pole”.** PWA polega na dymkach walidacji przeglądarki; apka pokazuje błąd pod polem.

**D-48 (2026-11-15) Szufladę zamyka też przeciągnięcie po samym panelu**, a progi liczone są od rzeczywistej szerokości panelu (min. z 82% ekranu i 330), nie od stałej 330.

## Otwarte, do rozstrzygnięcia w trakcie

- Biblioteka przeciągania w formularzu planu (Etap 8).
- Arkusze dolne: natywna prezentacja routera czy biblioteka (Etap 3).
- Rozwiązanie powiadomienia na Androidzie: własny moduł czy gotowa biblioteka (Etap 12).

## Backend: `POST /api/sync/push` (zadania 4.3–4.4)

**D-27 (2026-11-15) Jedna transakcja na operację przez kontekst asynchroniczny.** Repozytoria używają `db()` z `config/txContext.ts`; poza modułem sync to zwykły klient Prisma, więc ścieżki PWA działają jak dotąd. Powód: istniejące serwisy wołane pod blokadą wiersza użytkownika zakleszczałyby się na własnej blokadzie. Odrzucona operacja jest wycofywana w całości, a odrzucenie zapisuje osobna mała transakcja.

**D-28 (2026-11-15) Format odpowiedzi `push` zgodny z konwencją repo:** `{ success, data: { serverTime, results } }`, operacje płaskie `{ opId, type, at, ...pola }`. Wynik ma dodatkowe pole `code` (`validation`, `not_found`, `forbidden`, `conflict`, `bad_request`, `stale_start`, `unknown_type`).

**D-29 (2026-11-15) Powtórka operacji:** wcześniej `applied` wraca jako `duplicate`; zapisane `rejected` i `superseded` wracają bez zmian.

**D-30 (2026-11-15) Walidacja per operacja.** Błędna koperta żądania daje 400; błędne dane jednej operacji odrzucają tylko ją. Pola nazwy, siłowni, notatek i opisu przyjmują `null` (czyszczenie pola, D-23).

**D-31 (2026-11-15) Zakończenie starszego szkicu nie gasi nowszego aktywnego treningu.** Istniejący serwis czyści wskaźnik bezwarunkowo; sync przywraca go po `workout.complete` starszego treningu.

**D-32 (2026-11-15) Usunięcie nieistniejącego rekordu i `plan.unfavorite` nieistniejącego planu są sukcesem.** `item.add` z ćwiczeniem niewidocznym dla użytkownika jest odrzucane jako `not_found`; `opId` użyty przez inne konto jako `forbidden`.

**D-33 (2026-11-15) Numer serii nadaje urządzenie** (istniejący serwis ignoruje `setNumber` z żądania; ścieżka PWA bez zmian).

**D-34 (2026-11-15) Czas serwera dla danych pochodnych.** Wersje historii planu i `exercise_pending_notes.updatedAt` dostają czas serwera; czas z urządzenia dostają tylko rekordy główne.
