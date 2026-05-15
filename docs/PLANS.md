# Konwencja plików planistycznych

Pliki z planami realizacji przechowujemy w katalogu `plans/` w root repozytorium.

## Lokalizacja

- Katalog: `plans/`

## Format nazwy pliku

```
YYYY-MM-DD_HH-MM_co_ma_zrobic.md
```

Przykłady:
- `2026-05-14_21-26_workout_plans_feature.md`
- `2026-05-15_07-41_workout_plans_pr1_implementation.md`

## Cykl życia pliku

Pliki planistyczne są **tymczasowe** — istnieją tylko w trakcie aktywnej realizacji zadania.

| Etap | Działanie |
|---|---|
| Planowanie | Tworzysz plik wg konwencji w `plans/` |
| Implementacja | Plik pozostaje jako punkt odniesienia |
| Merge / zakończenie | **Plik jest usuwany** — historia zmian żyje w git, dokument planistyczny nie jest potrzebny w repozytorium |

> Katalog `plans/` jest prawidłowo pusty gdy wszystkie bieżące zadania są ukończone.
