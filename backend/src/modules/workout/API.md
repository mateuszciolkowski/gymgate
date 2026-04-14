# Workout API Documentation

Base URL: `/api/workouts`

## Workout Endpoints

### 1. Create New Workout (Start Training)

**POST** `/api/workouts`

**Request Body:**

```json
{
  "workoutDate": "2025-12-30T10:00:00Z", // optional, default: now
  "workoutName": "Trening PUSH", // optional
  "gymName": "Gold's Gym", // optional
  "location": "Warszawa", // optional
  "workoutNotes": "Dobra forma dzisiaj" // optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "workoutDate": "2025-12-30T10:00:00Z",
    "status": "DRAFT",
    "workoutName": "Trening PUSH",
    "gymName": "Gold's Gym",
    "location": "Warszawa",
    "workoutNotes": "Dobra forma dzisiaj",
    "items": [],
    "createdAt": "2025-12-30T10:00:00Z",
    "updatedAt": "2025-12-30T10:00:00Z"
  }
}
```

`lastNote` can be `null` when the latest completed workout item for this exercise had no note.

### 2. Get User Workouts

**GET** `/api/workouts?status=DRAFT&limit=10&offset=0`

**Query Parameters:**

- `status` (optional): `DRAFT` or `COMPLETED`
- `limit` (optional): number of workouts to return
- `offset` (optional): pagination offset

**Response:**

```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

Each stats entry may include `lastNote: null` if no note was saved on the latest completed workout item.

### 3. Get Workout by ID

**GET** `/api/workouts/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "workoutDate": "2025-12-30T10:00:00Z",
    "status": "DRAFT",
    "items": [
      {
        "id": "uuid",
        "exerciseId": "uuid",
        "orderInWorkout": 1,
        "notes": "Długa rozgrzewka",
        "exercise": {
          "id": "uuid",
          "name": "Wyciskanie sztangi",
          "muscleGroups": ["CHEST"],
          "photos": [...]
        },
        "sets": [
          {
            "id": "uuid",
            "setNumber": 1,
            "weight": 80.5,
            "repetitions": 10
          }
        ]
      }
    ]
  }
}
```

### 4. Update Workout

**PATCH** `/api/workouts/:id`

**Request Body:**

```json
{
  "status": "COMPLETED", // DRAFT or COMPLETED
  "workoutName": "Updated name",
  "workoutNotes": "New notes"
}
```

**Note:** When status is changed to `COMPLETED`, the system automatically:

- Updates `ExerciseUserStats` for all exercises
- Identifies new personal records
- Updates last workout data

### 5. Delete Workout

**DELETE** `/api/workouts/:id`

**Behavior:**

- Removes the workout record.
- Removes all workout items assigned to that workout.
- Removes all sets assigned to those workout items.
- Cleanup is executed in one backend transaction, so app state stays consistent.
- If deleted workout had status `COMPLETED`, `ExerciseUserStats` are recalculated for affected exercises:
  - records are recomputed from remaining completed workouts,
  - and stats row is removed when no completed workouts remain for that exercise.

## Exercise Management in Workout

### 6. Add Exercise to Workout

**POST** `/api/workouts/:workoutId/exercises`

**Request Body:**

```json
{
  "exerciseId": "uuid",
  "orderInWorkout": 1, // optional, auto-increments
  "notes": "Optional notes" // optional
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workoutId": "uuid",
    "exerciseId": "uuid",
    "orderInWorkout": 1,
    "notes": "Optional notes",
    "exercise": {...},
    "sets": [
      {
        "id": "uuid",
        "setNumber": 1,
        "weight": 0,
        "repetitions": 1
      }
    ]
  }
}
```

**Note:** First set is created automatically with default values (0 kg, 1 rep)

### 7. Update Workout Item

**PATCH** `/api/workouts/items/:itemId`

**Request Body:**

```json
{
  "orderInWorkout": 2,
  "notes": "Updated notes"
}
```

### 8. Delete Exercise from Workout

**DELETE** `/api/workouts/items/:itemId`

## Set Management

### 9. Add Set to Exercise

**POST** `/api/workouts/items/:itemId/sets`

**Request Body:**

```json
{
  "weight": 80.5,
  "repetitions": 10,
  "setNumber": 2 // optional, auto-increments
}
```

### 10. Update Set

**PATCH** `/api/workouts/sets/:setId`

**Request Body:**

```json
{
  "weight": 85.0,
  "repetitions": 8
}
```

**Validation rules:**

- `weight` (optional): number `>= 0`
- `repetitions` (optional): positive integer

### 11. Delete Set

**DELETE** `/api/workouts/sets/:setId`

## Statistics Endpoints

**Record definition in whole app:** personal record is always the **highest lifted weight** (`maxWeight`). Repetitions (`maxWeightReps`) are additional context for that top weight, not the primary ranking metric.

### 12. Get Stats Overview (global metrics)

**GET** `/api/workouts/stats/overview`

**Response:**

```json
{
  "success": true,
  "data": {
    "workoutsLastMonth": 8,
    "workoutsLastYear": 73,
    "totalSets": 1240,
    "totalVolume": 182430.5
  }
}
```

All values are calculated only from workouts with status `COMPLETED`.

### 13. Get Exercise Progression Timeline

**GET** `/api/workouts/stats/progression/:exerciseId?metric=maxSetWeight&from=2025-01-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z`

**Query Parameters:**

- `metric` (optional): `maxSetWeight` (default) or `volume`
- `from` (optional): ISO datetime lower bound
- `to` (optional): ISO datetime upper bound

**Response:**

```json
{
  "success": true,
  "data": {
    "exerciseId": "uuid",
    "metric": "maxSetWeight",
    "points": [
      {
        "workoutId": "uuid",
        "workoutDate": "2025-12-30T10:00:00Z",
        "maxSetWeight": 95,
        "repetitionsAtMaxSet": 6,
        "volume": 3120,
        "value": 95
      }
    ]
  }
}
```

### 14. Get Exercise Stats (Personal Records + Last Workout)

**GET** `/api/workouts/stats/exercise/:exerciseId`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "exerciseId": "uuid",
    "maxWeight": 100.0,
    "maxWeightReps": 5,
    "maxWeightDate": "2025-12-20T10:00:00Z",
    "lastWeight": 95.0,
    "lastReps": 8,
    "lastWorkoutDate": "2025-12-28T10:00:00Z",
    "totalWorkouts": 15,
    "lastNote": "Skupić się na wolniejszym opuszczaniu sztangi"
  }
}
```

**Or if first time:**

```json
{
  "success": true,
  "data": null,
  "message": "To twoje pierwsze wykonanie tego ćwiczenia"
}
```

### 15. Get All User Stats

**GET** `/api/workouts/stats/all`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "exerciseId": "uuid",
      "exercise": {
        "id": "uuid",
        "name": "Wyciskanie sztangi",
        "muscleGroups": ["CHEST"]
      },
      "maxWeight": 100.0,
      "maxWeightReps": 5,
      "maxWeightDate": "2025-12-20T10:00:00Z",
      "lastWeight": 95.0,
      "lastReps": 8,
      "lastWorkoutDate": "2025-12-28T10:00:00Z",
      "totalWorkouts": 15,
      "lastNote": "Skupić się na wolniejszym opuszczaniu sztangi"
    }
  ],
  "count": 25
}
```

## Typical Workout Flow

1. **Start workout:** `POST /api/workouts` → Returns workout with status `DRAFT`
2. **Add exercises:** `POST /api/workouts/:id/exercises` (multiple times)
3. **Add sets:** `POST /api/workouts/items/:itemId/sets` (multiple times per exercise)
4. **Optional notes updates:**
   - workout notes: `PATCH /api/workouts/:id` with `{"workoutNotes": "..."}`
   - exercise-in-workout notes: `PATCH /api/workouts/items/:itemId` with `{"notes": "..."}`
5. **Update sets:** `PATCH /api/workouts/sets/:setId` (if needed)
6. **Complete workout:** `PATCH /api/workouts/:id` with `{"status": "COMPLETED"}`
   - System automatically updates stats and records
7. **Delete workout (optional path):** `DELETE /api/workouts/:id`
   - System also removes nested workout items and sets.

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

Status codes:

- `400` - Validation error
- `403` - Permission denied
- `404` - Resource not found
- `500` - Server error
