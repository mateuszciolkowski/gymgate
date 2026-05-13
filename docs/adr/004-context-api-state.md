# ADR-004 – Context API zamiast zewnętrznego state managera

**Status:** Zaakceptowany  
**Data:** 2024

## Kontekst

Frontend wymaga globalnego stanu dla danych domenowych (treningi, ćwiczenia, statystyki) oraz stanu sesji. Dostępne opcje w ekosystemie React to Redux Toolkit, Zustand, Jotai lub natywne Context API.

## Decyzja

Zastosowano wyłącznie **React Context API** (`AuthContext` + `DataContext`) – bez żadnej zewnętrznej biblioteki stanu.

## Uzasadnienie

- **Prostota** – projekt ma jeden główny przepływ danych; dwa contexty (`AuthContext`, `DataContext`) w pełni pokrywają potrzeby.
- **Zero zależności** – brak dodatkowych paczek zmniejsza rozmiar bundle i ryzyko breaking changes.
- **Spójność z React 19** – natywne możliwości Reacta (Actions, `useOptimistic`) nie wymagają adaptera.
- **Czytelność** – `DataContext` eksponuje jasno zdefiniowany interfejs (`DataContextType`) ze wszystkimi akcjami.

## Konsekwencje

- `DataContext` jest monolitycznym plikiem (~1800 LOC) – wymaga dyscypliny przy rozbudowie.
- Każda zmiana stanu w `DataContext` re-renderuje wszystkich konsumentów; `useCallback`, `useMemo` i `useRef` są stosowane w celu ograniczenia zbędnych re-renderów.
- `exercisesRef`, `workoutsRef`, `statsRef` – refy stosowane w callbackach w celu uniknięcia stale closures bez rozszerzania tablicy zależności `useEffect`.

## Rozważane alternatywy

- **Zustand** – pominięty jako nadmiarowy dla obecnej skali; można rozważyć przy dalszej rozbudowie.
- **Redux Toolkit** – pominięty jako over-engineering dla tej aplikacji.
- **Jotai / Recoil** – atomowy model stanu niezgodny z obecną strukturą globalnego store'u.
