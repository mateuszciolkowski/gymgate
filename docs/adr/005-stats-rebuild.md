# ADR-005 – Pełny rebuild statystyk zamiast aktualizacji inkrementalnej

**Status:** Zaakceptowany  
**Data:** 2024

## Kontekst

`ExerciseUserStats` zawiera zagregowane dane (maxWeight, lastWeight, totalWorkouts) zależne od wszystkich zakończonych treningów użytkownika dla danego ćwiczenia. Te dane muszą być aktualizowane gdy:

- trening zmienia status na `COMPLETED` (lub powraca z `COMPLETED` do `DRAFT`),
- trening jest usuwany,
- seria w `COMPLETED` treningu jest dodana, edytowana lub usunięta,
- notatka `WorkoutItem` w `COMPLETED` treningu jest edytowana,
- ćwiczenie jest dodawane do już `COMPLETED` treningu,
- ćwiczenie jest usuwane z `COMPLETED` treningu.

Podejście inkrementalne (np. `UPDATE stats SET maxWeight = MAX(maxWeight, newWeight)`) jest trudne w przypadku usunięcia rekordu, który był rekordem osobistym.

## Decyzja

Przy każdym ze wskazanych zdarzeń wywoływana jest funkcja `rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseIds)`, która **usuwa i tworzy od nowa** rekordy `ExerciseUserStats`, agregując dane ze wszystkich `COMPLETED` workoutów.

## Uzasadnienie

- **Poprawność** – rebuild gwarantuje spójność nawet przy usunięciu rekordu osobistego lub retroaktywnej edycji serii.
- **Prostota** – jedna funkcja odpowiada za cały stan statystyk; nie jest wymagana logika rozróżniania, czy usunięta seria była rekordem.
- **Skala** – przy typowym użytkowaniu (dziesiątki–setki treningów) koszt pełnego rebuild jest pomijalny.
- **Transakcje** – rebuild można opakować w transakcję Prisma, co zapewnia atomowość operacji.

## Konsekwencje

- Przy bardzo dużej liczbie zakończonych treningów (tysiące) koszt rebuild może być znaczący; warto rozważyć cache invalidation + lazy rebuild lub background job.
- Funkcja wywoływana jest synchronicznie w ramach żądania HTTP – wprowadza dodatkową latency do `PATCH /api/workouts/:id` i `DELETE /api/workouts/:id`.
- Lokalizacja: `backend/src/modules/workout/workout.service.ts`, funkcja `rebuildExerciseStatsFromCompletedWorkouts`.

## Rozważane alternatywy

- **Inkrementalna aktualizacja** – pominięta ze względu na złożoność obsługi przypadku usunięcia rekordu osobistego.
- **Event sourcing / triggers DB** – pominięte jako over-engineering dla obecnej skali projektu.
- **Background job (queue)** – opcja do rozważenia w przyszłości przy > 10k treningów na użytkownika.
