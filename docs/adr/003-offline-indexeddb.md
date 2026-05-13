# ADR-003 – Offline-first z IndexedDB

**Status:** Zaakceptowany  
**Data:** 2024

## Kontekst

Aplikacja jest używana na siłowni, gdzie połączenie internetowe może być niestabilne lub całkowicie niedostępne. Użytkownik musi móc rejestrować serie i edytować trening bez przerw w działaniu aplikacji.

## Decyzja

Zastosowano strategię **offline-first** opartą na IndexedDB jako lokalnym, persystentnym magazynie danych. Wszystkie mutacje działają w trybie optimistic update; operacje nieudane z powodu braku sieci są kolejkowane w IndexedDB i synchronizowane po powrocie online przez `SyncManager`.

## Uzasadnienie

- **IndexedDB** – wbudowany w przeglądarki, nie wymaga biblioteki, obsługuje duże zestawy danych strukturalnych (w przeciwieństwie do `localStorage` z limitem ~5 MB).
- **Optimistic update** – natychmiastowa odpowiedź UI bez oczekiwania na odpowiedź serwera poprawia doświadczenie użytkownika w środowisku o słabym Wi-Fi.
- **pendingSync queue** – FIFO kolejka operacji umożliwia odtworzenie stanu w poprawnej kolejności po powrocie online.
- **temp ID mapping** – tymczasowe UUID (`temp_*`) zastępowane są prawdziwymi ID z serwera po synchronizacji, dzięki czemu kolejne operacje mogą zależeć od poprzednich.

## Konsekwencje

- Implementacja `SyncManager` jest złożona (zastępowanie temp IDs, retry logic, conflict detection).
- Operacje offline na encjach zależnych od niezapisanych encji (np. `addSet` gdy `workoutItem` ma temp ID) wymagają specjalnej obsługi poprzez `hasUnresolvedTempIds`.
- Po przekroczeniu `MAX_RETRIES = 3` operacja jest oznaczana jako permanentnie nieudana; wyświetlany jest wówczas `SyncFailureBanner`.
- Mechanizm rozwiązywania konfliktów nie jest zaimplementowany (last-write-wins przy synchronizacji).

## Rozważane alternatywy

- **Service Worker + Cache API** – rozwiązanie odpowiednie głównie dla zasobów statycznych; dla danych dynamicznych IndexedDB oferuje większą elastyczność.
- **Biblioteka (PouchDB, RxDB, Dexie)** – pominąć w celu uniknięcia zewnętrznych zależności; własny `localStore` pokrywa potrzeby obecnego modelu danych.
- **Brak obsługi offline** – wykluczone jako niezgodne z wymaganiami UX.
