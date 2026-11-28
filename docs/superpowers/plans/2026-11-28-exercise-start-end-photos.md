# Exercise start/end photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every dynamic exercise shows a START and an END photo (same person, other phase), in that order, in the PWA and the app.

**Architecture:** No schema change: `ExercisePhoto.photoStage` already exists. Ordering is fixed in three places: backend Prisma includes, PWA and app (shared sort with a parity fixture). The photo tooling learns to add a second-stage photo and relabel a stage. The images themselves come from the existing `exercise-photos` skill workflow, one exercise at a time with owner approval.

**Tech Stack:** Express + Prisma (backend, Vitest), React/Vite (PWA, Vitest), Expo/React Native (app, Jest), Google Flow via Claude in Chrome.

**Spec:** `docs/superpowers/specs/2026-11-28-exercise-start-end-photos-design.md`

## Global Constraints

- Stage order is exactly `START`, `MIDDLE`, `END`; unknown stages go last; equal stages keep their input order.
- Labels stay as they are: "Pozycja startowa", "Pozycja pośrednia", "Pozycja końcowa".
- No migration, no API field change (order only, additive).
- Static holds keep one photo: Plank, Plank boczny, Hollow body hold, Farmer walk.
- The two-clients commit hook needs `frontend/src` and `mobile/src` changes in the same commit.
- No AI attribution lines in commits or PRs (owner's rule). Ask before every push.

## Review Focus

- An exercise with one photo still shows no stage label (existing `photos.length > 1` rule) — keep it.
- An app user with photos already synced in the old order (END stored before START in SQLite JSON) must see START first → the client sort, not only the backend, guarantees it.
- A manifest that would give one exercise two photos of the same stage (e.g. second START) must be refused before writing.
- A relabel (`setStage`) of a photo id that belongs to another exercise must be refused.
- A photo with an unexpected stage value (e.g. `"SIDE"` from a future client) must not crash rendering and goes last.

---

### Task 1: Shared stage sort in both clients

**Files:**
- Create: `shared/parity/photoOrder.json`
- Create: `frontend/src/utils/photoOrder.ts`, `mobile/src/domain/photoOrder.ts`
- Modify: `frontend/src/features/exercises/components/ExercisePhotoButton.tsx`, `mobile/src/features/workouts/ExercisePhotoButton.tsx`
- Test: `frontend/src/utils/parity.test.ts`, `mobile/src/domain/parity.test.ts`

**Interfaces:**
- Produces: `sortPhotosByStage<T extends { photoStage: string }>(photos: T[]): T[]` (new array, input untouched) in both clients.

- [ ] **Step 1: Write the fixture** `shared/parity/photoOrder.json`:

```json
{ "cases": [
  { "name": "end before start", "stages": ["END", "START"], "expected": ["START", "END"] },
  { "name": "all three shuffled", "stages": ["MIDDLE", "END", "START"], "expected": ["START", "MIDDLE", "END"] },
  { "name": "single", "stages": ["START"], "expected": ["START"] },
  { "name": "unknown goes last, stable", "stages": ["SIDE", "END", "START", "SIDE2"], "expected": ["START", "END", "SIDE", "SIDE2"] },
  { "name": "empty", "stages": [], "expected": [] }
] }
```

- [ ] **Step 2: Add the case to both runners** (same body in each):

```ts
it("photoOrder", () => {
  for (const c of fixture("photoOrder").cases) {
    const photos = c.stages.map((s: string, i: number) => ({ id: String(i), photoStage: s }));
    expect([c.name, sortPhotosByStage(photos).map((p) => p.photoStage)]).toEqual([c.name, c.expected]);
    expect(photos.map((p: { photoStage: string }) => p.photoStage)).toEqual(c.stages); // input not mutated
  }
});
```

- [ ] **Step 3: Run both, expect FAIL** (`sortPhotosByStage` missing): `cd frontend && npx vitest run src/utils/parity.test.ts` and `cd mobile && npx jest src/domain/parity.test.ts`.
- [ ] **Step 4: Implement `sortPhotosByStage`** in both files: rank map `{START:0, MIDDLE:1, END:2}`, unknown = 3, `[...photos].sort` (stable).
- [ ] **Step 5: Use it** in both `ExercisePhotoButton` components: map over `sortPhotosByStage(photos)` instead of `photos`.
- [ ] **Step 6: Run both again, expect PASS**; also `cd mobile && npm run typecheck && npm run lint`.
- [ ] **Step 7: Commit** (both clients, one commit): `feat: show exercise photos in start → end order in the PWA and app`.

### Task 2: Backend returns photos ordered by stage

**Files:**
- Create: `backend/src/common/photoOrder.ts`
- Modify: `backend/src/modules/exercise/exercise.repository.ts` (5× `photos: true`), `backend/src/modules/workout/workout.repository.ts` (5× `photos: true`), `backend/src/modules/sync/sync.repository.ts:56`, `backend/src/modules/sync/sync.pull.repository.ts:78`
- Modify docs: `backend/src/modules/exercise/API.md`, `docs/api/openapi.yaml` (one line: "photos are ordered by photoStage: START, MIDDLE, END")
- Test: `backend/src/modules/sync/sync-pull.itest.ts`

**Interfaces:**
- Produces: `export const photosByStage = { orderBy: { photoStage: "asc" } } as const;` (Postgres enum order = START, MIDDLE, END).

- [ ] **Step 1: Write the failing itest** `"pull returns exercise photos ordered by stage"`: create an exercise, insert an `END` photo then a `START` photo with `prisma.exercisePhoto.create`, pull a snapshot, assert `exercise.photos.map(p => p.photoStage)` equals `["START", "END"]`.
- [ ] **Step 2: Run, expect FAIL** (createdAt order gives END first): `cd backend && npm run test:integration -- sync-pull`.
- [ ] **Step 3: Replace every `photos: true` with `photos: photosByStage`** and in `sync.pull.repository.ts` replace `orderBy: { createdAt: "asc" }` with `orderBy: { photoStage: "asc" }` inside the photos select.
- [ ] **Step 4: Run the itest, expect PASS**; then `cd backend && npm run typecheck && npm test`.
- [ ] **Step 5: Commit** with the two doc lines: `feat(backend): order exercise photos by stage`.

### Task 3: Photo tooling: second stage and relabel

**Files:**
- Modify: `backend/scripts/exercise-photos.ts`
- Create: `backend/scripts/exercise-photos.test.ts`
- Modify: `.claude/skills/exercise-photos/SKILL.md` (manifest format line)

**Interfaces:**
- Manifest entry, one of:
  - insert: `{ exerciseId, photoUrl, photoStage?: "START" | "END" }` (default `START`)
  - replace: `{ exerciseId, photoUrl, replacesPhotoId }` (unchanged)
  - relabel: `{ exerciseId, photoId, setStage: "START" | "END" }` (no file, no HTTP check)
- Produces: `export function planStages(existing: { id: string; photoStage: string }[], entries: ManifestEntry[]): string[]` → list of error strings for one exercise (empty = ok). Rule: after applying relabels and inserts, no stage appears twice; a relabel's `photoId` must be in `existing`.
- The script's `main` only runs when executed directly (`import.meta.url === pathToFileURL(process.argv[1]).href`), so the test can import it.

- [ ] **Step 1: Write failing tests** in `exercise-photos.test.ts`:
  - `planStages([{id:"a",photoStage:"START"}], [{exerciseId:"x",photoUrl:"u",photoStage:"END"}])` → `[]`
  - same existing + insert with default stage → one error containing `"START twice"`
  - existing START(a) + `{photoId:"a", setStage:"END"}` + insert START → `[]`
  - relabel of `photoId:"zzz"` not in existing → one error containing `"not a photo of"`
- [ ] **Step 2: Run, expect FAIL**: `cd backend && npx vitest run scripts/exercise-photos.test.ts`.
- [ ] **Step 3: Implement** `planStages`, export `ManifestEntry`, guard `main`, and in `apply`: group entries by `exerciseId`, call `planStages`, skip file/HTTP checks for relabel entries, drop the old "already has a photo — use replacesPhotoId" error for inserts that carry `photoStage`, and in the transaction write relabels as `exercisePhoto.update({ where: { id }, data: { photoStage } })` and inserts with their `photoStage`.
- [ ] **Step 4: Run tests, expect PASS**; `npx tsc --noEmit` on the script as before; local-DB dry run of a manifest with one insert END + one relabel (local DB, `PUBLIC_API_BASE` pointed at a local static server as in the first run).
- [ ] **Step 5: Commit** with the SKILL.md manifest line: `chore(scripts): exercise-photos supports END photos and stage relabel`.

### Task 4: Ship the code

- [ ] **Step 1:** Ask the owner to push. Then push, open the PR to `dev`, and merge after CI passes. Fast-forward `main` to `dev`, as in the previous deploy.
- [ ] **Step 2:** Wait for `GET https://gymgate-api.mateuszciolkowski.pl/api/exercises`, authenticated as the owner's dev account or via the PWA. If that is not possible, check the Railway deploy finished and `curl -sI` any `/uploads` file → 200.

### Task 5: Generate END/START photos, one exercise at a time (operational)

Follows `.claude/skills/exercise-photos/SKILL.md` (gates G1–G4). Run folder: `backend/backups/photo-runs/<date>-pairs/`.

- [ ] **Step 1:** Run the G1 backup and `list`. Build `pairs.md` with one row per exercise:
  - the existing file and which phase it really shows (`START` / `END` / `STATIC`), judged against the research notes;
  - the missing phase.
  Static holds are `STATIC`, skipped.
- [ ] **Step 2:** For each exercise in `pairs.md` order, generate the missing phase in Flow with the existing photo as the only image reference. Prompt:
  > Redraw the reference image 1:1 — same person, face, hair, outfit, equipment, camera angle, framing, line style and background. Change ONLY the body position to the {START|END} position of {exercise}: {one line from research}. Anatomically correct, no text.
- [ ] **Step 3:** Check the candidate:
  - the anatomy checklist;
  - identity against the existing photo: same person, outfit, equipment and angle. Any change is a fail.
  Show the owner the START | END pair. If the existing photo is really END, the pair shows it as END. Log the answer in `approvals.tsv`.
- [ ] **Step 4:** After every ~10 approved exercises:
  - commit the files (new names `<slug>_<id>-end.jpeg` / `-start.jpeg`), ask, push, merge, deploy;
  - write the `manifest.json` with inserts carrying `photoStage` and the relabels;
  - G4 dry run, then G1(b) backup, then `--commit`;
  - verify with `list`.
- [ ] **Step 5:** Final report:
  - how many pairs were completed, which exercises keep one photo and why;
  - the backup file names.
