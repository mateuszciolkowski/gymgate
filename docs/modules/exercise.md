# Module: Exercise

## Responsibility

Exercise CRUD. Exercises are **global** (no `creatorUserId`) or **private** (with `creatorUserId` = user's id). Deleting a user cascades to their private exercises.

## Domain Model

```
Exercise
  id              UUID
  name            string (max 200)
  muscleGroups    MuscleGroup[]   ← enum, min 1 element
  description     string?
  creatorUserId   string?         ← null = global exercise
  photos          ExercisePhoto[]

ExercisePhoto
  id, exerciseId, photoStage (START | MIDDLE | END), photoUrl
```

## Muscle Groups (MuscleGroup enum)

`CHEST | BACK | SHOULDERS | BICEPS | TRICEPS | FOREARMS | ABS | OBLIQUES | LOWER_BACK | QUADS | HAMSTRINGS | GLUTES | CALVES | ADDUCTORS | HIP_FLEXORS | TRAPS | LATS | MIDDLE_BACK | NECK | FULL_BODY`

## Endpoints (all require authMiddleware)

| Method | Path                  | Description                                               |
|--------|-----------------------|----------------------------------------------------------|
| GET    | `/api/exercises`      | List exercises (filter: muscleGroup, name, creatorUserId) |
| GET    | `/api/exercises/:id`  | Single exercise                                           |
| POST   | `/api/exercises`      | Create exercise (creatorUserId = logged-in user)          |
| PATCH  | `/api/exercises/:id`  | Edit exercise                                             |
| DELETE | `/api/exercises/:id`  | Delete exercise                                           |

## Query Params (GET /api/exercises)

```typescript
{
  muscleGroup?: MuscleGroup
  name?: string           // filter by name (case-insensitive)
  creatorUserId?: string  // "null" returns global exercises
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

## Errors

| Code | Situation |
|------|-----------|
| 401  | Missing / expired token |
| 404  | Exercise not found |
| 422  | Zod validation error |

## Files

```
backend/src/modules/exercise/
  exercise.routes.ts
  exercise.controller.ts
  exercise.service.ts
  exercise.repository.ts
  exercise.schema.ts    ← createExerciseSchema, updateExerciseSchema, filterExercisesSchema
  API.md                ← full req/res contracts
```
