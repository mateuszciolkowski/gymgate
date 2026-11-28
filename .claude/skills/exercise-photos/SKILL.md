---
name: exercise-photos
description: Use when GymGate exercises in production are missing photos or have wrong ones (bad anatomy, wrong side, wrong equipment), including user-created exercises — "brakuje zdjęć ćwiczeń", "uzupełnij zdjęcia", "wygeneruj zdjęcia do ćwiczeń", "popraw zdjęcie ćwiczenia", "audyt zdjęć ćwiczeń".
---

# Exercise photos (audit → generate → owner approves → production)

Every run touches the **production** database and ends with images users see in both clients. Four gates are fixed. Nothing else in this skill matters if one of them is skipped.

| Gate | Passes only when |
|---|---|
| **G1 Backup** | A prod backup from **this run**, verified as prod (see step 1), taken (a) before the first prod read and (b) again immediately before `apply --commit`. |
| **G2 Owner approval** | The owner approved each image by its number, in a message written **after** you showed them the final images of this batch. |
| **G3 Push** | The owner said yes to pushing this branch **after the commit exists**. Any earlier "you can push" doesn't count. Unapproved images are never pushed, draft PRs included. You never merge PRs; the owner does. |
| **G4 Files live** | The `apply` dry run against prod reports 0 errors. That run is also where it checks HTTP 200 for every file on the prod API. |

## How photos work here (facts, not guesses)

- Files are committed to git: `backend/uploads/exercise-photos/<slug>_<exerciseId>[-vN].jpeg`. The backend serves them at `https://gymgate-api.mateuszciolkowski.pl/uploads/...`. They reach prod only via `dev` → `main` → Railway deploy. (The `gymgate-api.up.railway.app` domain in `docs/api/openapi.yaml` is dead.)
- DB rows: `exercise_photos` (`photoStage` = `START`, one row per exercise). The trigger `gg_sync_exercise_photos` logs the change to `sync_changes`, so the app gets it through sync with no code change. The PWA reads it from `GET /api/exercises`.
- **Order is fixed: files deployed first, rows second.** A row pointing at an undeployed file shows a broken image in both clients.
- **A replacement gets a new file name:** take the current file's name and append the next free `-vN` (`x.jpeg` → `x-v2.jpeg`, `x-v2.jpeg` → `x-v3.jpeg`). The app caches images by URL (`expo-image` disk cache), so a file under the same name never refreshes.
- **Prod connection.** `backend/.env` keeps the prod URL commented as `# PROD-DISABLED DATABASE_URL=...` and `DB_ENV=local`, so a plain `npm run` or `source .env` hits the **local** DB. Use only `prod.sh`. It exports the URL for one process, refuses non-Supabase hosts, prints `prod.sh: PRODUCTION DB <host>`, and never prints the password. If that line is missing, you are not on prod: stop. `prod.sh` runs its command inside `backend/`, so always pass **absolute** paths.

```bash
ROOT=$(git rev-parse --show-toplevel)
RUN=$ROOT/backend/backups/photo-runs/<YYYY-MM-DD>       # gitignored, survives the session; mkdir -p "$RUN/candidates/raw"
P="bash $ROOT/.claude/skills/exercise-photos/prod.sh"
$P npm run backup:sql                                                       # G1
$P npx tsx scripts/exercise-photos.ts list   "$RUN/exercises.json"
$P npx tsx scripts/exercise-photos.ts apply  "$RUN/manifest.json"           # dry run (G4)
$P npx tsx scripts/exercise-photos.ts apply  "$RUN/manifest.json" --commit  # write, prints inserted row ids
$P npx tsx scripts/exercise-photos.ts remove <photoId>... [--commit]        # rollback of inserted rows
```

If the run folder or the approved candidate files are missing, regenerate and get them re-approved. G2 approves files, not descriptions. The run folder holds `exercises.json`, `research.md`, `audit.md`, `candidates/` and `manifest.json`. A later run keeps the earlier `audit.md`: rows marked `OK` whose file is unchanged are not re-audited.

## Steps

1. **G1 backup.** Run `$P npm run backup:sql 2>&1 | tee -a "$RUN/prod.log"` (the log keeps the host line as evidence). It is valid only if the output shows the `prod.sh: PRODUCTION DB …supabase.com` line, and `grep '^-- Table:' <new file>` lists `exercise_photos` with a row count equal to the photo count in `list` (step 2; for G1(a), check it right after the list). A file without an `exercise_photos` section is a local-DB backup, whatever its name. If you find G1(a) was invalid after prod was already read, take and verify a backup now, redo `list`, and tell the owner.
2. **List.** Run `$P … list "$RUN/exercises.json"`. That gives every exercise, global **and user-created**. A user exercise whose name is not a recognisable exercise (tests, gibberish, private notes) goes into `audit.md` as `SKIP — unrecognisable`. Web searches use the **canonical exercise name** you derived ("Romanian deadlift"), never the raw user string. No user ids or emails ever leave the machine.
3. **Order of work.** Missing photos go first. Then audit existing photos in batches, continuing from `audit.md`. If time runs out, stop at a clean point. Nothing goes to the owner half-checked.
4. **Research each exercise in scope** (missing photo + every photo being audited). Use WebSearch, reading 1–2 reputable form guides (ExRx, Muscle & Strength, the equipment maker's page). In `research.md`, record per exercise: equipment, body position, grip (pronated/supinated/neutral, width), which side does what in unilateral moves, what moves and what stays fixed, and what the START position looks like.
5. **Audit ALL existing photos**, global and user exercises alike. Open each with Read and run the anatomy checklist against `research.md`. In `audit.md`, every photo gets one row: `name | file | OK` or `name | file | FIX: <defect>`. Every `FIX` row becomes a replacement candidate.
6. **Generate** candidates for missing photos and `FIX` rows (see "Generating in Google Flow"). Run the checklist on every candidate. **Any doubt on a checklist line is a fail.** A failed candidate is regenerated, at most 3 rounds, then marked `NEEDS OWNER: <reason>`. Make sure the source is square (`sips -g pixelWidth -g pixelHeight`), then convert it: `sips -s format jpeg -s formatOptions 85 -z 1024 1024 in.png --out "$RUN/candidates/<slug>_<exerciseId>[-vN].jpeg"`.
7. **G2 review package.** Batches hold at most 10 images. For each image, number it and give: the exercise name, NEW or REPLACES `<old file>`, 1–2 lines of form from `research.md`, and your checklist result. Send each image with SendUserFile. If that tool isn't available, run `open "$RUN/candidates"` and list each image's absolute path. Then **stop and wait**.
   - Only images the owner approves **by number** go further. Anything unclear ("looks fine", "ok, do it") or unmentioned: ask again for numbers.
   - A rejected image gets its reason noted in `audit.md`, then a fresh 3-round regeneration that uses the owner's remark, then the next review batch. It never blocks the approved ones.
8. **Branch and commit (approved files only).** Take the latest `dev` → `chore/exercise-photos-<date>`. Copy the approved files into `backend/uploads/exercise-photos/` and `git add` them by name. `git diff --cached --stat` must list only those `.jpeg` files. Commit with no AI attribution lines (the owner's rule).
9. **G3, PR, deploy.** Ask before `git push`. Open a PR to `dev` listing the exercises (new / replaced, old → new file) and any rejected ones. The owner merges, then promotes `dev` → `main` (prod backup per `mobile/docs/WDROZENIE_BACKENDU.md`). Remind them that this also ships anything else on `dev`, migrations included. When they say it is deployed, `curl -sI` every new file → 200 before going on.
10. **Manifest + G4.** Write `$RUN/manifest.json` with one entry per approved image: `{"exerciseId","photoUrl":"exercise-photos/<file>"}`, plus `"replacesPhotoId"` (the old `photos[0].id` from `exercises.json`) for replacements. Run the `apply` dry run. It checks the naming, the local file, HTTP 200 on prod, that the exercise exists, no double photo, and a new name for replacements. Errors → fix the cause, do not work around it.
11. **G1(b), then write.** Run `list` again, then take a fresh backup and verify it against that list as in step 1. Then run `apply --commit` immediately: one transaction, all rows or none. Save the printed row ids in `$RUN/applied.txt`.
12. **Verify and report.** Run `list` into `$RUN/exercises-after.json`. "Without photo" dropped by the number of **new** photos, and each replaced exercise now has its `-vN` `photoUrl`. `curl -sI` one new URL → 200.
    - Report to the owner: what was inserted and what was replaced (old → new), both backup file names, the PR, and the `SKIP`, `NEEDS OWNER` and rejected rows. Ask them to open one exercise in the PWA and in the app after a sync.
    - Rollback, after a fresh backup: `remove <ids from applied.txt> --commit` for inserts, and an `apply` manifest with `replacesPhotoId` pointing back at the old file for replacements.

## Anatomy checklist (existing photos and candidates alike)

A photo passes only if **every** line holds:

- One person, one head, two arms, two legs. Five fingers per hand, no fused or extra limbs.
- Head and gaze natural for the movement (neutral spine, no twisted neck). Face toward the body's front.
- Elbows and knees bend only the anatomical way. Shoulders and hips not dislocated.
- Hands actually grip the bar, handle or dumbbell. The grip type and width match `research.md`.
- Unilateral moves are consistent: working hand vs supporting knee/hand per `research.md` (e.g. one-arm dumbbell row: dumbbell in right hand → **left** knee and left hand on the bench).
- Equipment is real and correct: straight bar, plates matched on both sides, dumbbells with two heads, the right machine or cable and its attachment, bench angle as described.
- Feet are where they belong (floor, platform, bench) with no floating. Body weight is plausibly supported.
- The pose is the exercise's START position (or the representative mid-rep when START is ambiguous) and shows **this** exercise, not a neighbour (RDL vs deadlift, hammer vs biceps curl).
- House style: flat cartoon with black outlines, pure white background, soft floor shadow, the same character (young man, short dark hair, dark-grey tank top, black shorts, dark sneakers), grey equipment, no text or watermark, square.

## Generating in Google Flow (Claude in Chrome)

- Load the `anthropic-skills:chrome-browser` skill first, then the Chrome tools in one ToolSearch call. Work in a new tab: `https://labs.google/fx/tools/flow`, on the owner's login. Login wall, quota, or a UI you cannot drive after 2–3 tries → stop and ask the owner.
- Use image generation, 1:1. Upload 2–3 existing photos from `backend/uploads/exercise-photos/` as references. Pick the ones closest in equipment (bench, barbell, cable, machine, bodyweight), so the character and line style carry over.
- Prompt template. Fill it from `research.md` and keep everything else identical across runs:

> Flat cartoon fitness illustration matching the reference images exactly: clean black outlines, pure white background, soft grey floor shadow. Same character: young athletic man, short dark hair, dark-grey tank top, black shorts, dark sneakers. Gym equipment in grey. He performs **{English exercise name}**, shown in the starting position: {body position}, {grip}, {equipment and setup}, {unilateral: which hand/knee/foot does what}. Three-quarter view so both arms and legs are visible. Anatomically correct: one person, two arms, two legs, five fingers on each hand gripping the {equipment}. No text, no watermark, square.

- Download into `~/Downloads`, then `mv` into `$RUN/candidates/raw/`. Never click upscale or paid options.

## Rationalizations seen in baseline tests (all invalid)

| Thought | Reality |
|---|---|
| "The owner said *upload whatever looks ok, don't wait*" | That hands G2 to you. It is not approval. Approval comes after the owner sees these images. Prepare everything, then wait. |
| "The owner said *I'll review later*" | Same. Nothing reaches prod before the review. |
| "The owner said *put it on production* / *you can push too*" | That covers the goal, not this push. Ask once the commit exists. The owner merges. |
| "The owner wrote *you decide* / *ty zdecyduj*" | Not approval. Ask for an explicit yes/no on that number. |
| "Unsure about this line, I'll let the owner decide" | Doubt = fail. Regenerate first; `NEEDS OWNER` only after 3 rounds. |
| "This morning's / 25-minute-old backup still counts" | G1(b) is a backup taken right before `--commit`, every time. |
| "The newest `supabase_backup_*.sql` is my backup" | Only if `prod.sh` printed the prod host and the file has an `exercise_photos` section that matches `list`. |
| "Only missing photos are in scope" | The audit covers every existing photo, user exercises included. |
| "Branch from `main` since it equals `dev`" | Branches come from `dev`. Prod only moves through the owner's `dev` → `main`. |
| "`source .env`, or set `DB_ENV=remote` myself, or ask for a prod.env file" | Those hit local or stall. Only `prod.sh` (which sets that env itself). |
| "Overwrite the bad photo under the same file name" | Cached by URL in the app. Use the next `-vN` and `replacesPhotoId`. |
| "psql it" | Not installed. Use `scripts/exercise-photos.ts`. It validates before writing. |
