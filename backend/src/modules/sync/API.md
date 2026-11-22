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

Integer fields are bounded: `repetitions` 1–10000; `setNumber`, `orderInWorkout`, `durationSeconds` fit Postgres INT4. An out-of-range value (or other invalid data the database refuses) rejects that single operation (`validation` / `bad_request`) instead of failing the whole request with 500.

Rules: operations run in order, each in its own transaction starting with `SELECT ... FOR UPDATE` on the user row; one rejection never aborts the rest. A rejected/superseded result is stored too, so a replay returns it unchanged. Newer change wins; equal timestamps apply; write sets `updatedAt = at`. `workout.create` always creates a workout (never returns the existing active one); the later `startedAt` becomes the active workout, the other stays DRAFT. `startedAt` older than 30 days is rejected. Deleting or unfavoriting a missing record succeeds.

## GET /api/sync/pull

Auth: Bearer JWT. Limit: 60 requests/min per user. Query: `cursor` XOR `snapshotToken` (both -> 400; invalid value -> 400 `Nieprawidłowy kursor` / `Nieprawidłowy token pobierania`).

Response `data` (same shape for every mode):

```json
{
  "cursor": "v1.<txid>.<seq>.<issuedAtMs>",
  "hasMore": false,
  "resyncRequired": false,
  "snapshotToken": null,
  "upserts": { "workouts": [], "workoutItems": [], "workoutSets": [], "exercises": [], "plans": [], "pendingNotes": [], "profile": null },
  "deletes": [{ "entity": "workout", "id": "..." }],
  "serverTime": "2026-11-15T10:00:00.000Z"
}
```

`snapshotToken` is present only on snapshot pages. `cursor` is opaque.

**Snapshot** (no params): page 1 = all visible exercises, plans (with `items` and `isFavorite`), pending notes, `profile` and the first 200 workouts (ordered by id) with their items and sets; `snapshotToken` (non-null while more workouts remain) requests the next page, which carries only workouts/items/sets. `cursor` is taken BEFORE anything is read and is identical on all pages; the client stores it only after the last page (`hasMore: false`). Writes that land while paging are delivered by the first incremental pull.

**Incremental** (`cursor`): at most 500 changes. The journal (`sync_changes`, filled by DB triggers) only says which record changed; for each changed record the server returns its CURRENT state as seen by the requester: visible -> `upserts` (full flat row), otherwise -> `deletes`. Visibility: own workouts (items, sets); global + own exercises; own, built-in and public plans; pending notes of the user; `profile` is the user's own row. A public plan made private, or deleted, therefore arrives as a delete for everyone else. Children removed by a parent's cascade (items and sets of a deleted workout) are not guaranteed to get their own delete: the client applies the cascade for the parent delete (workout -> items -> sets; exercise -> its workout items with sets, plan items, pending note; plan -> plan items, and `workoutPlanId` of workouts becomes null, which arrives as a workout upsert). Plan items removed by an exercise delete arrive as a plan upsert with the shorter `items` list.

Cursor safety: a cursor is `(txid, seq)`; only journal rows from transactions older than the xmin of the statement's PostgreSQL snapshot (`pg_snapshot_xmin(pg_current_snapshot())`) are returned, so a transaction that is still open is never skipped: its rows are returned by a later pull once it commits. With no further pages the cursor jumps to `xmin:0`.

`resyncRequired: true` (with `cursor: null`, empty upserts/deletes): the cursor was issued more than 90 days ago (journal and processed operations are purged after 90 days at server start and daily). The client must start a new snapshot and keep its outbox.

Row shapes (all dates ISO strings, `weight` a decimal string):

| entity | fields |
|---|---|
| workout | id, userId, workoutDate, status, workoutName, gymName, location, workoutNotes, durationSeconds, workoutPlanId, skippedPlanExerciseIds, createdAt, updatedAt |
| workoutItem | id, workoutId, exerciseId, orderInWorkout, notes, previousNote, createdAt, updatedAt |
| workoutSet | id, itemId, setNumber, weight, repetitions, createdAt, updatedAt |
| exercise | id, name, muscleGroups, description, creatorUserId, createdAt, updatedAt, photos `[{ id, photoStage, photoUrl }]` |
| plan | id, name, shortName, creatorUserId, isPublic, isFavorite, createdAt, updatedAt, items `[{ id, exerciseId, orderInPlan }]` |
| pendingNote | exerciseId (the id of the note), note, updatedAt |
| profile | id, email, firstName, lastName, phone, isAdmin, activeWorkoutId (never the password) |

`deletes[].entity` is one of workout, workoutItem, workoutSet, exercise, plan, pendingNote (id = exercise id for pendingNote).
