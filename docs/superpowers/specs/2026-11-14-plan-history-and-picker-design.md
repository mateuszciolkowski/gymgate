# Plan history + plan picker (favorites + built-in)

## Intent

1. When starting a workout, the plan picker showed only favorite plans. Users want built-in
   plans there too, with favorites on top and a "Ulubione" badge.
2. Users want to see how a plan looked before: which exercises were added, removed,
   reordered, renamed — read-only.

## Decisions (agreed with the user)

- Picker = favorites ∪ built-in (`creatorUserId === null`). Favorites first with badge;
  a built-in favorite appears once, on top. Own non-favorite and community plans are not listed.
- History is visible only to whoever can edit the plan: the author, or an admin for built-in plans.
- View only. No "restore this version".
- Approach A: full snapshot per change (`WorkoutPlanVersion`), diff computed on read.

## Approaches considered

- **A. Snapshot per change (picked)** — simple, every version readable on its own, survives
  exercise rename/delete because exercise names are copied into the snapshot.
- B. Store change events — must replay to show a full version; more code, no user benefit.
- C. PostgreSQL trigger — bypasses the routes→service→repository layering, hard to test.

## Design

- Table `workout_plan_versions`: `planId` (cascade delete), `version` (1..n, unique per plan),
  `name`, `shortName`, `isPublic`, `exercises` JSON `[{exerciseId, name}]` in plan order, `createdAt`.
- Written inside the same transaction as plan create/update (`plan.repository.ts`).
  Create → v1. Update → new version only if the snapshot differs from the latest one.
- Plans that existed before this feature have no versions. On their first edit the pre-edit
  state is stored as v1 (with `createdAt = plan.updatedAt`), then the new state as v2.
  No data backfill in the migration.
- `GET /api/plans/:id/history` → versions newest first. Plan with no stored versions returns
  its current state as a synthetic v1. 403 when caller can't edit the plan.
- Frontend: "Historia" button on the plan edit screen opens a modal. Each version shows its
  diff vs the previous one (`+` added, `−` removed, `↕` moved, name/short name/public changes)
  and can expand to the full exercise list. Online-only like the rest of plan CRUD; not cached
  in `DataContext`.
- "Moved" = exercises outside the longest increasing subsequence of common exercises, so a
  single insert or one dragged item doesn't flag every shifted row.

## Left to the builder

- Who made the change is not stored (not requested).
- `isGlobal` toggles are visible only through `isPublic`.
