# Moduł: Exercise

## Odpowiedzialność

CRUD ćwiczeń. Ćwiczenia są **globalne** (bez `creatorUserId`) lub **prywatne** (z `creatorUserId` = id użytkownika). Usunięcie użytkownika kaskadowo usuwa jego prywatne ćwiczenia.

## Model domenowy

```
Exercise
  id              UUID
  name            string (max 200)
  muscleGroups    MuscleGroup[]   ← enum, min 1 element
  description     string?
  creatorUserId   string?         ← null = ćwiczenie globalne
  photos          ExercisePhoto[]

ExercisePhoto
  id, exerciseId, photoStage (START | MIDDLE | END), photoUrl
```

## Grupy mięśniowe (MuscleGroup enum)

`CHEST | BACK | SHOULDERS | BICEPS | TRICEPS | FOREARMS | ABS | OBLIQUES | LOWER_BACK | QUADS | HAMSTRINGS | GLUTES | CALVES | ADDUCTORS | HIP_FLEXORS | TRAPS | LATS | MIDDLE_BACK | NECK | FULL_BODY`

## Endpointy (wszystkie wymagają authMiddleware)

| Metoda | Ścieżka               | Opis                                              |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/api/exercises`      | Lista ćwiczeń (filtr: muscleGroup, name, creatorUserId) |
| GET    | `/api/exercises/:id`  | Pojedyncze ćwiczenie                              |
| POST   | `/api/exercises`      | Utwórz ćwiczenie (creatorUserId = zalogowany user) |
| PATCH  | `/api/exercises/:id`  | Edytuj ćwiczenie                                  |
| DELETE | `/api/exercises/:id`  | Usuń ćwiczenie                                    |

## Query params (GET /api/exercises)

```typescript
{
  muscleGroup?: MuscleGroup
  name?: string           // filtr po nazwie (case-insensitive)
  creatorUserId?: string  // "null" zwraca ćwiczenia globalne
}
```

## Response – Exercise

```typescript
{
  id: string
  name: string
  muscleGroups: MuscleGroup[]
  description: string | null
  creatorUserId: string | null
  createdAt: string
  updatedAt: string
  photos: ExercisePhoto[]
  creator: { id, firstName, lastName, email } | null
}
```

## Błędy

| Kod | Sytuacja |
|-----|----------|
| 401 | Brak / wygasły token |
| 404 | Ćwiczenie nie istnieje |
| 422 | Błąd walidacji Zod |

## Pliki

```
backend/src/modules/exercise/
  exercise.routes.ts
  exercise.controller.ts
  exercise.service.ts
  exercise.repository.ts
  exercise.schema.ts    ← createExerciseSchema, updateExerciseSchema, filterExercisesSchema
  API.md                ← pełne req/res kontrakty
```
