# Exercise photos: start and end position — design

Date: 2026-11-28 · Size: small change (no migration)

## Intent

Every exercise shows two photos, the **start** and the **end** position, so a user sees at a glance how the movement goes. The existing photo stays as one half of the pair. The second photo is the **same person, equipment, camera angle and style in the other phase**.

## Goals / non-goals / anti-goals

- Goal: every dynamic exercise has a START and an END photo, shown in that order in the PWA and the app.
- Goal: each new photo is approved by the owner, one exercise at a time, shown as a START | END pair.
- Non-goal: replacing existing photos or unifying characters. Women and other characters stay.
- Non-goal: MIDDLE photos.
- Anti-goal: a second photo that changes the person, outfit, equipment or angle. That is worse than a single photo.
- Static holds (plank, side plank, hollow body hold, farmer walk) keep one photo.

## What exists today

- `ExercisePhoto.photoStage` enum START / MIDDLE / END. An exercise can have many photos. All 95 current rows are `START`.
- PWA `frontend/src/features/exercises/components/ExercisePhotoButton.tsx` and app `mobile/src/features/workouts/ExercisePhotoButton.tsx` already render every photo with the labels "Pozycja startowa" / "Pozycja końcowa".
- Order is not guaranteed. REST (`exercise.repository.ts`, `photos: true`) has no `orderBy`. Sync pull orders by `createdAt`.
- Some current photos labelled START actually show the end position (e.g. lateral raise with arms up).

## Approaches

1. **Chosen: image-to-image redraw in Google Flow from the existing photo** ("same image 1:1, change only the pose to the other phase"). It keeps the person and scene. It worked first time for the lateral-raise machine, where text prompts had failed repeatedly.
2. Generate both photos from scratch. Rejected by the owner: it loses the existing person.
3. Hand-edit in PIL. Only usable for small local fixes, not for a new pose.

## Decided

- **Order by stage everywhere**: backend REST and sync pull use `orderBy: photoStage asc` (enum order START, MIDDLE, END). Both clients also sort by stage before rendering, because the app keeps photos as JSON in SQLite and old rows may arrive unsorted. The sort is shared logic with a parity fixture `shared/parity/photoOrder.json` and tests in both suites.
- **Tooling**: `backend/scripts/exercise-photos.ts apply` gains:
  - `photoStage` per entry (default `START`), allowing a second photo of another stage. Two photos of the same stage on one exercise are refused.
  - `setStage` on an existing photo id, to relabel START → END when the current image shows the end.
- **Per exercise**: decide which phase the existing photo shows (from `research.md`), generate the other phase from it, check it against the anatomy checklist and against the existing photo (same person, outfit, equipment, angle), and show the owner the START | END pair.
- **Order of work**: code change and deploy first, so pairs appear in the right order. Then exercises one by one. Approved files are committed in batches. DB rows are written after each batch is deployed, with a fresh prod backup and the existing gates of the `exercise-photos` skill.
- An exercise that fails after the owner's feedback keeps its single photo.

## Left to the builder

The exact parity fixture shape, batch size per deploy, and the order of exercises.
