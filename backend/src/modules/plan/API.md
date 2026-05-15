# Workout Plan Endpoints

Wszystkie endpointy wymagają nagłówka `Authorization: Bearer <JWT>` lub ważnego cookie `token` (zob. `auth/API.md`).

Plany **built-in** mają `creatorUserId = null`. Plany użytkowników mają `creatorUserId = <userId>`.
Konwencja: ćwiczenia o `creatorUserId IN (null, "1")` są traktowane jako globalne — mogą być częścią planu publicznego.

---

## GET /api/plans

Lista planów filtrowana zakładką.

**Query Parameters:**
```typescript
{
  tab?: "mine" | "builtin" | "community"   // default "mine"
}
```

Filtry:
- `mine` — plany, których `creatorUserId === <userId>`
- `builtin` — plany z `creatorUserId === null`
- `community` — plany publiczne innych użytkowników (`isPublic=true AND creatorUserId != <userId>`)

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
  items: WorkoutPlanItem[]   // posortowane po orderInPlan asc
  createdAt: string
  updatedAt: string
}

interface WorkoutPlanItem {
  id: string
  planId: string
  exerciseId: string
  orderInPlan: number
  exercise: Exercise         // pełny obiekt z exercise/API.md
}
```

---

## GET /api/plans/:id

Szczegóły planu. Dostępne dla właściciela, planów built-in oraz publicznych planów innych użytkowników.

**Response:** `{ success: true, data: WorkoutPlan }`

**Błędy:** `404` gdy plan nie istnieje lub nie jest widoczny dla użytkownika.

---

## POST /api/plans

Tworzy plan należący do bieżącego użytkownika.

**Body:**
```typescript
{
  name: string              // 3-100 znaków, unikalna nazwa per user
  exerciseIds: string[]     // 1-50 UUID, bez duplikatów
  isPublic?: boolean        // default false
}
```

**Response (201):** `{ success: true, data: WorkoutPlan }`

**Błędy:**
- `409` — `Plan with this name already exists` (duplikat nazwy; odporne na race condition: serwer chwyta unique violation z DB)
- `400` — `Exercises not found: <id>, ...` (co najmniej jedno ćwiczenie nie istnieje)
- `400` — `Cannot make plan public: contains private exercises (<name>, ...)` (przy `isPublic=true` z prywatnymi ćwiczeniami)

---

## PUT /api/plans/:id

Aktualizuje plan. Tylko właściciel.

**Body:**
```typescript
{
  name?: string             // 3-100
  exerciseIds?: string[]    // jeśli podane: replace-all, kolejność = orderInPlan
  isPublic?: boolean
}
```

**Response:** `{ success: true, data: WorkoutPlan }`

**Błędy:** `403` (nie właściciel), `404` (brak), `400` (walidacja ćwiczeń / public), `409` (duplikat nazwy).

---

## DELETE /api/plans/:id

Usuwa plan (cascade `WorkoutPlanItem`). Powiązane `Workout.workoutPlanId` zostaje wyzerowane (`SET NULL`).

**Response (204):** brak body.

**Błędy:** `403` (nie właściciel), `404` (brak).

---

## POST /api/plans/:id/duplicate

Tworzy prywatną kopię widocznego planu (built-in, własny lub cudzy public).
Nazwa kopii: `<original> (kopia)` lub `<original> (kopia N)` przy konflikcie.

**Response (201):** `{ success: true, data: WorkoutPlan }` — `isPublic=false`, `creatorUserId=<userId>`.

**Błędy:** `404` (źródło niewidoczne).
