# Workout Plan Endpoints

All endpoints require the `Authorization: Bearer <JWT>` header or a valid `token` cookie (see `auth/API.md`).

**Built-in** plans have `creatorUserId = null`. User plans have `creatorUserId = <userId>`.
Convention: exercises with `creatorUserId IN (null, "1")` are treated as global — they can be part of a public plan.

---

## GET /api/plans

List plans filtered by tab.

**Query Parameters:**
```typescript
{
  tab?: "mine" | "builtin" | "community"   // default "mine"
}
```

Filters:
- `mine` — plans where `creatorUserId === <userId>`
- `builtin` — plans with `creatorUserId === null`
- `community` — public plans of other users (`isPublic=true AND creatorUserId != <userId>`)

**Response:**
```typescript
{
  success: true
  data: WorkoutPlan[]
  count: number
}

interface WorkoutPlan {
  id: string
  name: string
  creatorUserId: string | null
  isPublic: boolean
  items: WorkoutPlanItem[]   // sorted by orderInPlan asc
  createdAt: string
  updatedAt: string
}

interface WorkoutPlanItem {
  id: string
  planId: string
  exerciseId: string
  orderInPlan: number
  exercise: Exercise         // full object from exercise/API.md
}
```

---

## GET /api/plans/:id

Plan details. Accessible to the owner, for built-in plans, and for public plans of other users.

**Response:** `{ success: true, data: WorkoutPlan }`

**Errors:** `404` when the plan does not exist or is not visible to the user.

---

## POST /api/plans

Creates a plan belonging to the current user.

**Body:**
```typescript
{
  name: string              // 3-100 characters, unique name per user
  exerciseIds: string[]     // 1-50 UUIDs, no duplicates
  isPublic?: boolean        // default false
}
```

**Response (201):** `{ success: true, data: WorkoutPlan }`

**Errors:**
- `409` — `Plan with this name already exists` (duplicate name; resilient to race conditions: server catches unique violation from DB)
- `400` — `Exercises not found: <id>, ...` (at least one exercise does not exist)
- `400` — `Cannot make plan public: contains private exercises (<name>, ...)` (when `isPublic=true` with private exercises)

---

## PUT /api/plans/:id

Updates a plan. Owner only.

**Body:**
```typescript
{
  name?: string             // 3-100
  exerciseIds?: string[]    // if provided: replace-all, order = orderInPlan
  isPublic?: boolean
}
```

**Response:** `{ success: true, data: WorkoutPlan }`

**Errors:** `403` (not owner), `404` (not found), `400` (exercise validation / public), `409` (duplicate name).

---

## DELETE /api/plans/:id

Deletes a plan (cascades `WorkoutPlanItem`). Related `Workout.workoutPlanId` is set to null (`SET NULL`).

**Response (204):** no body.

**Errors:** `403` (not owner), `404` (not found).

---

## POST /api/plans/:id/duplicate

Creates a private copy of a visible plan (built-in, own, or another user's public).
Copy name: `<original> (copy)` or `<original> (copy N)` on conflict.

**Response (201):** `{ success: true, data: WorkoutPlan }` — `isPublic=false`, `creatorUserId=<userId>`.

**Errors:** `404` (source not visible).
