# Exercise Endpoints

## GET /api/exercises

**Query Parameters:**
```typescript
{
  muscleGroup?: MuscleGroup  // CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, ABS, OBLIQUES, LOWER_BACK, QUADS, HAMSTRINGS, GLUTES, CALVES, ADDUCTORS, HIP_FLEXORS, TRAPS, LATS, MIDDLE_BACK, NECK, FULL_BODY
  name?: string
  creatorUserId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  data: Exercise[]
  count: number
}
```

---

## GET /api/exercises/:id

**URL Parameters:**
```typescript
{
  id: string  // UUID
}
```

**Response:**
```typescript
{
  success: boolean
  data: Exercise
}
```

---

## POST /api/exercises

**Body:**
```typescript
{
  name: string                    // min 1, max 200
  muscleGroups: MuscleGroup[]    // min 1 element
  description?: string
  photos?: Array<{
    photoStage: PhotoStage       // START, MIDDLE, END
    photoUrl: string
  }>
}
```

**Response:**
```typescript
{
  success: boolean
  data: Exercise
}
```

---

## PATCH /api/exercises/:id

**URL Parameters:**
```typescript
{
  id: string  // UUID
}
```

**Body:**
```typescript
{
  name?: string                   // min 1, max 200
  muscleGroups?: MuscleGroup[]   // min 1 element
  description?: string
}
```

**Response:**
```typescript
{
  success: boolean
  data: Exercise
}
```

---

## DELETE /api/exercises/:id

**URL Parameters:**
```typescript
{
  id: string  // UUID
}
```

**Response:**
```
204 No Content
```

---

## Exercise Type

```typescript
{
  id: string
  name: string
  muscleGroups: MuscleGroup[]
  description: string | null
  creatorUserId: string
  createdAt: string
  updatedAt: string
  photos: ExercisePhoto[]
  creator: {
    id: string
    name: string
    email: string
  }
}
```

## ExercisePhoto Type

```typescript
{
  id: string
  exerciseId: string
  photoStage: PhotoStage
  photoUrl: string
  createdAt: string
}
```
