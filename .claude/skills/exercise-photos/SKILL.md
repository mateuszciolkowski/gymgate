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
| **G3 Push** | The owner said yes to pushing this branch **after the commit exists**. Any earlier "you can push" doesn't count. Unapproved images are never pushed, draft PRs included. You merge (PR → `dev`, `dev` → `main`) only when the owner explicitly asks you to in that same confirmation; otherwise the owner merges. |
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
p() { bash "$ROOT/.claude/skills/exercise-photos/prod.sh" "$@"; }   # a function, not P="bash …": zsh does not word-split variables
p npm run backup:sql                                                       # G1
p npx tsx scripts/exercise-photos.ts list   "$RUN/exercises.json"
p npx tsx scripts/exercise-photos.ts apply  "$RUN/manifest.json"           # dry run (G4)
p npx tsx scripts/exercise-photos.ts apply  "$RUN/manifest.json" --commit  # write, prints inserted row ids
p npx tsx scripts/exercise-photos.ts remove <photoId>... [--commit]        # rollback of inserted rows
```

Shell state does not survive between Bash calls: define `ROOT`, `RUN` and `p` again in every call.

If the run folder or the approved candidate files are missing, regenerate and get them re-approved. G2 approves files, not descriptions. The run folder holds `exercises.json`, `research.md`, `audit.md`, `candidates/` and `manifest.json`. A later run keeps the earlier `audit.md`: rows marked `OK` whose file is unchanged are not re-audited.

## Steps

1. **G1 backup.** Run `p npm run backup:sql 2>&1 | tee -a "$RUN/prod.log"` (the log keeps the host line as evidence). It is valid only if the output shows the `prod.sh: PRODUCTION DB …supabase.com` line, and `grep '^-- Table:' <new file>` lists `exercise_photos` with a row count equal to the photo count in `list` (step 2; for G1(a), check it right after the list). A file without an `exercise_photos` section is a local-DB backup, whatever its name. If you find G1(a) was invalid after prod was already read, take and verify a backup now, redo `list`, and tell the owner.
2. **List.** Run `p … list "$RUN/exercises.json"`. That gives every exercise, global **and user-created**. A user exercise whose name is not a recognisable exercise (tests, gibberish, private notes) goes into `audit.md` as `SKIP — unrecognisable`. Web searches use the **canonical exercise name** you derived ("Romanian deadlift"), never the raw user string. No user ids or emails ever leave the machine.
3. **Order of work.** Missing photos go first. Then audit existing photos in batches, continuing from `audit.md`. If time runs out, stop at a clean point. Nothing goes to the owner half-checked.
4. **Research each exercise in scope** (missing photo + every photo being audited). Use WebSearch, reading 1–2 reputable form guides (ExRx, Muscle & Strength, the equipment maker's page). In `research.md`, record per exercise: equipment, body position, grip (pronated/supinated/neutral, width), which side does what in unilateral moves, what moves and what stays fixed, and what the START position looks like.
5. **Audit ALL existing photos**, global and user exercises alike. Read them as contact sheets (6 per sheet, 512 px each, labelled `#n name`, built with PIL into `$RUN/sheets/`), then open any doubtful one at full size before judging grips or sides. Run the anatomy checklist against `research.md`. Also flag exercises that are duplicates of each other (same movement, different names). Merging duplicates is a separate decision for the owner: check every reference first (workout items, plan items, plan versions, pending notes, stats, `skippedPlanExerciseIds`), and deleting an exercise needs the owner's explicit yes plus a fresh backup. In `audit.md`, every photo gets one row: `name | file | OK` or `name | file | FIX: <defect>`. Every `FIX` row becomes a replacement candidate.
6. **Generate** candidates for missing photos and `FIX` rows (see "Generating in Google Flow"). Run the checklist on every candidate. **Any doubt on a checklist line is a fail.** A failed candidate is regenerated, at most 3 rounds, then marked `NEEDS OWNER: <reason>`. Make sure the source is square (`sips -g pixelWidth -g pixelHeight`), then convert it: `sips -s format jpeg -s formatOptions 85 -z 1024 1024 in.png --out "$RUN/candidates/<slug>_<exerciseId>[-vN].jpeg"`.
7. **G2 review, one image at a time** (the owner's preference). For each image build `$RUN/review/NN.jpg`: a title line, one line of why, and OLD | NEW side by side for replacements. Send it with SendUserFile (if that tool isn't available, `open` the file and give its absolute path) together with: what is there now, what you propose and why, your checklist result, and anything you are unsure of. Then **stop and wait** for that number's answer before sending the next one. Log every answer in `$RUN/approvals.tsv`.
   - Only images the owner approves **by number** go further. Anything unclear ("looks fine", "ok, do it") or unmentioned: ask again for numbers.
   - A rejected image gets its reason noted, then a fresh regeneration that uses the owner's remark. It never blocks the approved ones. The owner may also say "keep the old one": then the old photo stays and the candidate is deleted.
   - **After a rejection about pose, grip or equipment, ask the owner for a reference photo** and redraw it 1:1 (see "Redraw a real photo"). Text descriptions failed repeatedly where a redraw succeeded on the first try.
8. **Branch and commit (approved files only).** Take the latest `dev` → `chore/exercise-photos-<date>`. Copy the approved files into `backend/uploads/exercise-photos/` and `git add` them by name. `git diff --cached --stat` must list only those `.jpeg` files. Commit with no AI attribution lines (the owner's rule).
9. **G3, PR, deploy.** Ask before `git push`. Open a PR to `dev` listing the exercises (new / replaced, old → new file) and any rejected ones. The owner merges, then promotes `dev` → `main` (prod backup per `mobile/docs/WDROZENIE_BACKENDU.md`). Remind them that this also ships anything else on `dev`, migrations included. When they say it is deployed, `curl -sI` every new file → 200 before going on.
10. **Manifest + G4.** Write `$RUN/manifest.json` with one entry per approved change: insert `{"exerciseId","photoUrl":"exercise-photos/<file>","photoStage"?: "START"|"END"}` (default START; second-phase files are named `<slug>_<id>-end.jpeg` / `-start.jpeg`), replace `{"exerciseId","photoUrl","replacesPhotoId"}` (old id from `exercises.json`), relabel `{"exerciseId","photoId","setStage"}` when an existing photo shows the other phase. The script refuses two photos of one stage. Run the `apply` dry run. It checks the naming, the local file, HTTP 200 on prod, that the exercise exists, no double photo, and a new name for replacements. Errors → fix the cause, do not work around it.
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
- House style: flat cartoon with black outlines, pure white background, soft floor shadow, grey equipment, no text or watermark, square. Existing photos use several characters (man in a dark-grey tank top, man in navy, woman in navy): that is not a defect. New photos use the man in the dark-grey tank top, black shorts and dark sneakers.
- Supinated grips (chin-up, reverse-grip pushdown, Bayesian curl) are where both the generator and your own eye fail most: the generator draws an overhand grip, and in a flat cartoon palm and back of the hand look alike. Treat every supinated grip as doubtful until the owner confirms it.

## Generating in Google Flow (Claude in Chrome)

- Load the `anthropic-skills:chrome-browser` skill first, then the Chrome tools in one ToolSearch call. Work in a new tab: `https://labs.google/fx/tools/flow`, on the owner's login. Login wall, quota, or a UI you cannot drive after 2–3 tries → stop and ask the owner.
- New project → settings chip next to the prompt: **Obraz**, **1:1**, Nano Banana, **x2** (two variants; it costs 0 points). Never click upscale, 2K/4K or paid options.
- **Uploading references.** "Prześlij" opens a native file picker you cannot drive. Before clicking it, patch `HTMLInputElement.prototype.click` with `javascript_tool` so a `type=file` input is attached to the page instead of opened. Then find it with `find` and fill it with `file_upload` (files must be in the working directory or an upload the owner sent). An uploaded file stays in the project library, so re-use it as an ingredient through "Dodaj składniki do pola prompta" → the option → "Dodaj do prompta". At most 2 ingredients stick per prompt.
- Use the man in the dark-grey tank top (e.g. `alternating-dumbbell-curl_*.jpeg`) as the character reference, plus a photo of the real equipment when the machine matters.
- Several prompts can be queued at once; wait until no tile shows a `NN%` counter.
- **Downloading.** Tile → "Więcej opcji" → "Pobierz" → "1K Pierwotny rozmiar". The file lands in `~/Downloads` named after Flow's caption (e.g. `Man_performing_…_<hash>.jpg`), not after your prompt. `mv` it into `$RUN/candidates/raw/` right away, and match by download order, not by caption. A `javascript_tool` call times out after 45 s, so download at most 5 per call.
- Prompt template. Fill it from `research.md` and keep everything else identical across runs:

> Flat cartoon fitness illustration matching the reference images exactly: clean black outlines, pure white background, soft grey floor shadow. Same character: young athletic man, short dark hair, dark-grey tank top, black shorts, dark sneakers. Gym equipment in grey. He performs **{English exercise name}**, shown in the starting position: {body position}, {grip}, {equipment and setup}, {unilateral: which hand/knee/foot does what}. Three-quarter view so both arms and legs are visible. Anatomically correct: one person, two arms, two legs, five fingers on each hand gripping the {equipment}. No text, no watermark, square.

### Redraw a real photo (most reliable)

When the owner sends a photo of the exercise or machine, save it to `$RUN/refs/`, upload it, and prompt:

> Redraw the PHOTO reference exactly 1:1 as a flat cartoon illustration in the style of the cartoon reference. Keep EXACTLY the same pose, body position, arm angles, grip, camera angle and the same machine — trace it, do not change the pose. Only change: flat cartoon style with clean black outlines; dark-grey tank top, black shorts, dark sneakers; short dark hair; pure white background with a soft grey floor shadow; remove the surroundings, logos, text and other people. Square, centred, fully visible. Anatomically correct: one person, two arms, two legs, five fingers on each hand. No text, no watermark.

Show it next to the owner's photo. A small local defect in an otherwise good image (e.g. one hand wrong) can be fixed in PIL by mirroring the correct part. Show the owner the result at full size.

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
