# Plan: Stale Workout Detection + Editable End Time

## Problem
Timer liczy czas od `workout.createdAt`. Gdy trening zostanie jako DRAFT przez wiele godzin
(np. użytkownik zapomniał zakończyć), timer pokazuje 11+ godzin przy kolejnym otwarciu apki.

## Rozwiązanie

### Część 1: Stale Workout Detection — `App.tsx`
- Próg: 2h nieaktywności (max z updatedAt treningu/ćwiczeń/serii)
- Gdy `!isLoading && activeWorkoutId` i trening jest DRAFT > 2h stary → dialog
- Dialog: "Nie było aktywności od X godz. Czy zakończyć trening?"
- "Zakończ" → `completeWorkout(id, lastActivity - createdAt)`
- "Kontynuuj" → dismiss (raz na sesję, via `staleCheckDone` ref)

### Część 2: Edytowalne pole końca treningu — `WorkoutDetailScreen.tsx`
- W trybie edycji COMPLETED treningu: nowe pole `type="time"` "Godzina zakończenia"
- Inicjalizacja: `createdAt + durationSeconds`
- Live preview: "Czas treningu: Xh Ymin" (live update przy zmianie godziny)
- Zapis: `durationSeconds = endTime - createdAt`

## Pliki
1. `frontend/src/App.tsx` — ~90 linii dodanych
2. `frontend/src/components/screens/WorkoutDetailScreen.tsx` — ~36 linii dodanych

## Status
- [ ] App.tsx — stale detection + dialog
- [ ] WorkoutDetailScreen.tsx — editable end time
