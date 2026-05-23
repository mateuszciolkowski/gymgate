# ADR-005 – Full Stats Rebuild Instead of Incremental Updates

**Status:** Accepted  
**Date:** 2024

## Context

`ExerciseUserStats` contains aggregated data (maxWeight, lastWeight, totalWorkouts) dependent on all completed workouts for a given exercise by a user. This data must be updated when:

- a workout changes status to `COMPLETED` (or reverts from `COMPLETED` to `DRAFT`),
- a workout is deleted,
- a set in a `COMPLETED` workout is added, edited, or deleted,
- a `WorkoutItem` note in a `COMPLETED` workout is edited,
- an exercise is added to an already `COMPLETED` workout,
- an exercise is removed from a `COMPLETED` workout.

An incremental approach (e.g. `UPDATE stats SET maxWeight = MAX(maxWeight, newWeight)`) is difficult when deleting the record that was the personal best.

## Decision

On each of the listed events, the function `rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseIds)` is called, which **deletes and recreates** `ExerciseUserStats` records by aggregating data from all `COMPLETED` workouts.

## Rationale

- **Correctness** – rebuild guarantees consistency even when deleting a personal record or retroactively editing sets.
- **Simplicity** – a single function handles the entire stats state; no logic needed to determine whether a deleted set was the record.
- **Scale** – with typical usage (tens to hundreds of workouts), the cost of a full rebuild is negligible.
- **Transactions** – rebuild can be wrapped in a Prisma transaction, ensuring atomicity.

## Consequences

- With a very large number of completed workouts (thousands), rebuild cost may become significant; consider cache invalidation + lazy rebuild or a background job.
- The function is called synchronously within the HTTP request – introduces additional latency to `PATCH /api/workouts/:id` and `DELETE /api/workouts/:id`.
- Location: `backend/src/modules/workout/workout.service.ts`, function `rebuildExerciseStatsFromCompletedWorkouts`.

## Alternatives Considered

- **Incremental update** – rejected due to complexity of handling personal record deletion.
- **Event sourcing / DB triggers** – rejected as over-engineering for the current project scale.
- **Background job (queue)** – option to consider in the future with > 10k workouts per user.
