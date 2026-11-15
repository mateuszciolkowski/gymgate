import type { WorkoutPlanVersion } from "./types";

export type PlanChange =
  | { type: "added"; name: string }
  | { type: "removed"; name: string }
  | { type: "moved"; name: string; from: number; to: number }
  | { type: "name"; from: string; to: string }
  | { type: "shortName"; from: string | null; to: string | null }
  | { type: "public"; to: boolean };

/** Indices (into `seq`) of one longest strictly increasing subsequence. O(n²), n ≤ 50. */
function lisIndices(seq: number[]): Set<number> {
  const len = seq.map(() => 1);
  const prev = seq.map(() => -1);
  let best = -1;
  for (let i = 0; i < seq.length; i++) {
    for (let j = 0; j < i; j++) {
      if (seq[j]! < seq[i]! && len[j]! + 1 > len[i]!) {
        len[i] = len[j]! + 1;
        prev[i] = j;
      }
    }
    if (best === -1 || len[i]! > len[best]!) best = i;
  }
  const out = new Set<number>();
  for (let i = best; i !== -1; i = prev[i]!) out.add(i);
  return out;
}

/** What changed between two consecutive plan versions. Positions are 1-based. */
export function diffVersions(prev: WorkoutPlanVersion, next: WorkoutPlanVersion): PlanChange[] {
  const changes: PlanChange[] = [];
  if (prev.name !== next.name) changes.push({ type: "name", from: prev.name, to: next.name });
  if (prev.shortName !== next.shortName) {
    changes.push({ type: "shortName", from: prev.shortName, to: next.shortName });
  }
  if (prev.isPublic !== next.isPublic) changes.push({ type: "public", to: next.isPublic });

  const prevIds = prev.exercises.map((e) => e.exerciseId);
  const nextIds = next.exercises.map((e) => e.exerciseId);

  for (const e of next.exercises) {
    if (!prevIds.includes(e.exerciseId)) changes.push({ type: "added", name: e.name });
  }
  for (const e of prev.exercises) {
    if (!nextIds.includes(e.exerciseId)) changes.push({ type: "removed", name: e.name });
  }

  // Exercises kept in both versions: those outside the longest run that kept its relative
  // order were moved. An insert or a single drag then doesn't flag every shifted row.
  const commonPrev = prevIds.filter((id) => nextIds.includes(id));
  const common = next.exercises.filter((e) => prevIds.includes(e.exerciseId));
  const kept = lisIndices(common.map((e) => commonPrev.indexOf(e.exerciseId)));
  common.forEach((e, i) => {
    if (kept.has(i)) return;
    changes.push({
      type: "moved",
      name: e.name,
      from: prevIds.indexOf(e.exerciseId) + 1,
      to: nextIds.indexOf(e.exerciseId) + 1,
    });
  });

  return changes;
}
