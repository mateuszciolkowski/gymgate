/**
 * Exercise photo tooling used by the `exercise-photos` skill.
 *
 *   tsx scripts/exercise-photos.ts list <out.json>           → writes JSON of every exercise (global + user) with its photos
 *   tsx scripts/exercise-photos.ts apply <manifest.json>     → dry run: validates the manifest, writes nothing
 *   tsx scripts/exercise-photos.ts apply <manifest.json> --commit → writes exercise_photos rows in one transaction, prints their ids
 *   tsx scripts/exercise-photos.ts remove <photoId>... [--commit] → rollback of inserted rows (dry run without --commit)
 *
 * Connects with DATABASE_URL from the environment (the skill passes the prod URL per command).
 *
 * Manifest entries, one of:
 *   insert:  { "exerciseId", "photoUrl": "exercise-photos/<slug>_<exerciseId>[-start|-end][-vN].jpeg", "photoStage"?: "START" | "END" }  (default START)
 *   replace: { "exerciseId", "photoUrl", "replacesPhotoId" }   (same stage, new file name)
 *   relabel: { "exerciseId", "photoId", "setStage": "START" | "END" }   (no file)
 * One exercise never ends up with two photos of the same stage. Every file must exist in backend/uploads and already
 * be served by PUBLIC_API_BASE (deployed), otherwise nothing is written.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE ?? "https://gymgate-api.mateuszciolkowski.pl";

type Stage = "START" | "MIDDLE" | "END";
export type ManifestEntry =
  | { exerciseId: string; photoUrl: string; photoStage?: Stage; replacesPhotoId?: undefined; photoId?: undefined; setStage?: undefined }
  | { exerciseId: string; photoUrl: string; replacesPhotoId: string; photoStage?: undefined; photoId?: undefined; setStage?: undefined }
  | { exerciseId: string; photoId: string; setStage: Stage; photoUrl?: undefined; replacesPhotoId?: undefined; photoStage?: undefined };

/** Errors for one exercise's entries: a relabel must target one of its photos, and no stage may end up twice. */
export function planStages(existing: { id: string; photoStage: string }[], entries: ManifestEntry[]): string[] {
  const errors: string[] = [];
  const stageById = new Map(existing.map((p) => [p.id, p.photoStage]));
  const added: string[] = [];
  for (const e of entries) {
    if (e.photoId !== undefined) {
      if (!stageById.has(e.photoId)) errors.push(`${e.photoId}: not a photo of this exercise`);
      else stageById.set(e.photoId, e.setStage);
    } else if (e.replacesPhotoId === undefined) {
      added.push(e.photoStage ?? "START");
    }
  }
  const stages = [...stageById.values(), ...added];
  for (const st of new Set(stages)) if (stages.filter((x) => x === st).length > 1) errors.push(`${st} twice`);
  return errors;
}

const prisma = new PrismaClient();

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "(DATABASE_URL not set)";
  }
}

async function list(outPath: string) {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      muscleGroups: true,
      creatorUserId: true,
      photos: { select: { id: true, photoStage: true, photoUrl: true } },
    },
  });
  console.error(`DB host: ${dbHost()} · exercises: ${exercises.length} · without photo: ${exercises.filter((e) => e.photos.length === 0).length}`);
  fs.writeFileSync(outPath, JSON.stringify(exercises, null, 2));
  console.error(`Written ${outPath}`);
}

async function apply(manifestPath: string, commit: boolean) {
  const entries: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const uploadsDir = path.join(process.cwd(), "uploads");
  const errors: string[] = [];

  const byExercise = new Map<string, ManifestEntry[]>();
  for (const e of entries) byExercise.set(e.exerciseId, [...(byExercise.get(e.exerciseId) ?? []), e]);

  for (const e of entries) {
    if (e.photoUrl === undefined) continue; // relabel: no file
    if (!/^exercise-photos\/[a-z0-9-]+_[0-9a-f-]{36}(-(start|end))?(-v\d+)?\.jpeg$/.test(e.photoUrl)) errors.push(`${e.photoUrl}: bad name (exercise-photos/<slug>_<exerciseId>[-start|-end][-vN].jpeg)`);
    if (!e.photoUrl.includes(e.exerciseId)) errors.push(`${e.photoUrl}: file name does not contain exerciseId ${e.exerciseId}`);
    if (!fs.existsSync(path.join(uploadsDir, e.photoUrl))) errors.push(`${e.photoUrl}: missing in backend/uploads`);
    const res = await fetch(`${PUBLIC_API_BASE}/uploads/${e.photoUrl}`, { method: "HEAD" }).catch(() => null);
    if (!res || res.status !== 200) errors.push(`${e.photoUrl}: not served by ${PUBLIC_API_BASE} (HTTP ${res?.status ?? "error"}) — deploy first`);
  }

  for (const [exerciseId, group] of byExercise) {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, include: { photos: true } });
    if (!exercise) {
      errors.push(`${exerciseId}: exercise not found`);
      continue;
    }
    errors.push(...planStages(exercise.photos, group).map((m) => `"${exercise.name}": ${m}`));
    for (const e of group) {
      if (e.replacesPhotoId !== undefined) {
        const old = exercise.photos.find((p) => p.id === e.replacesPhotoId);
        if (!old) errors.push(`${e.replacesPhotoId}: not a photo of "${exercise.name}"`);
        // The app caches images by URL (expo-image disk cache): a replacement must get a new file name.
        else if (old.photoUrl === e.photoUrl) errors.push(`${e.photoUrl}: replacement reuses the old file name — use -v2, -v3…`);
        console.error(`REPLACE "${exercise.name}" → ${e.photoUrl}`);
      } else if (e.photoId !== undefined) {
        console.error(`RELABEL "${exercise.name}" ${e.photoId} → ${e.setStage}`);
      } else {
        console.error(`INSERT  "${exercise.name}" ${e.photoStage ?? "START"} → ${e.photoUrl}`);
      }
    }
  }

  console.error(`DB host: ${dbHost()} · entries: ${entries.length} · errors: ${errors.length}`);
  if (errors.length) {
    errors.forEach((m) => console.error(`  ✗ ${m}`));
    process.exit(1);
  }
  if (!commit) {
    console.error("Dry run OK. Re-run with --commit to write.");
    return;
  }

  const rows = await prisma.$transaction(
    entries.map((e) =>
      e.photoId !== undefined
        ? prisma.exercisePhoto.update({ where: { id: e.photoId }, data: { photoStage: e.setStage } })
        : e.replacesPhotoId !== undefined
          ? prisma.exercisePhoto.update({ where: { id: e.replacesPhotoId }, data: { photoUrl: e.photoUrl } })
          : prisma.exercisePhoto.create({ data: { exerciseId: e.exerciseId, photoStage: e.photoStage ?? "START", photoUrl: e.photoUrl } }),
    ),
  );
  console.error(`✅ Written ${rows.length} photo rows (ids for rollback):`);
  rows.forEach((r) => console.error(`  ${r.id}  ${r.photoStage}  ${r.photoUrl}`));
}

async function remove(ids: string[], commit: boolean) {
  const photos = await prisma.exercisePhoto.findMany({ where: { id: { in: ids } }, include: { exercise: { select: { name: true } } } });
  photos.forEach((p) => console.error(`DELETE "${p.exercise.name}" → ${p.photoUrl}`));
  console.error(`DB host: ${dbHost()} · found ${photos.length}/${ids.length}`);
  if (photos.length !== ids.length) {
    console.error("  ✗ some ids not found — nothing deleted");
    process.exit(1);
  }
  if (!commit) return console.error("Dry run OK. Re-run with --commit to delete.");
  const { count } = await prisma.exercisePhoto.deleteMany({ where: { id: { in: ids } } });
  console.error(`✅ Deleted ${count} photo rows.`);
}

// Run only when executed directly (the test imports planStages).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const commit = rest.includes("--commit");
  const args = rest.filter((a) => a !== "--commit");
  const run =
    cmd === "list" && args[0] ? list(args[0])
    : cmd === "apply" && args[0] ? apply(args[0], commit)
    : cmd === "remove" && args.length ? remove(args, commit)
    : Promise.reject(new Error("usage: list <out.json> | apply <manifest.json> [--commit] | remove <photoId>... [--commit]"));

  run
    .catch((err) => {
      console.error("❌", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
