# Sync module

Mobile-app only. PWA keeps using the old endpoints. All responses use `{ success, data }` / `{ success: false, error }`.

## POST /api/sync/push

Auth: Bearer JWT. Limits: 100 operations per request, 60 requests/min per user (429).

Request: `{ deviceId: string, ops: Op[] }`. Each op is flat: `{ opId, type, at, ...fields }` (`at` = ISO time of the change on the device; the server clamps future values to its own time).

Types and fields (see `sync.schema.ts`): `workout.create` (`id, workoutDate, workoutName?, gymName?, workoutPlanId?, startedAt`), `workout.update`, `workout.complete`, `workout.delete`, `workout.skipPlanExercise`, `item.add|update|delete`, `set.add|update|delete`, `exercise.create|update|delete`, `plan.create|update|delete|duplicate|favorite|unfavorite`.

Response `data`: `{ serverTime, results: [{ opId, status, code?, error?, current? }] }`.

| status | meaning |
|---|---|
| `applied` | executed |
| `duplicate` | replay of an operation already applied (stored result) |
| `superseded` | a newer change exists on the server (`at` < record `updatedAt`); `current` = server row |
| `rejected` | permanent: `code` = validation / not_found / forbidden / conflict / bad_request / stale_start / unknown_type; `error` = service message; `current` = server row or null |

Rules: operations run in order, each in its own transaction starting with `SELECT ... FOR UPDATE` on the user row; one rejection never aborts the rest. A rejected/superseded result is stored too, so a replay returns it unchanged. Newer change wins; equal timestamps apply; write sets `updatedAt = at`. `workout.create` always creates a workout (never returns the existing active one); the later `startedAt` becomes the active workout, the other stays DRAFT. `startedAt` older than 30 days is rejected. Deleting or unfavoriting a missing record succeeds.
