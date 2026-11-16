import { fuzzyMatch } from "./fuzzyMatch";
import { MUSCLE_GROUPS } from "./muscleGroups";

export interface FilterableExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  creatorUserId?: string | null;
  photos?: unknown[];
}

export interface ExerciseFilter {
  userId: string;
  query: string;
  group?: string;
  desc?: boolean;
  onlyMine?: boolean;
  onlyPerformed?: boolean;
  onlyWithPhoto?: boolean;
  /** Exercises already in the workout (picker only). */
  excludeIds?: ReadonlySet<string>;
  /** Exercise ids that have stats. */
  performedIds?: ReadonlySet<string>;
}

export const groupLabel = (group: string) => MUSCLE_GROUPS.find((m) => m.value === group)?.label ?? group;

/** Order of ExerciseList.tsx in the PWA; the query also matches the Polish group labels (D-18). */
export function filterExercises<T extends FilterableExercise>(all: T[], f: ExerciseFilter): T[] {
  const q = f.query.trim();
  return all
    .filter((e) => !f.group || e.muscleGroups.includes(f.group))
    .filter((e) => e.creatorUserId == null || e.creatorUserId === "1" || e.creatorUserId === f.userId)
    .filter((e) => !f.excludeIds?.has(e.id))
    .filter((e) => !q || fuzzyMatch(e.name, q) || e.muscleGroups.some((g) => fuzzyMatch(g, q) || fuzzyMatch(groupLabel(g), q)))
    .filter((e) => !f.onlyMine || e.creatorUserId === f.userId)
    .filter((e) => !f.onlyPerformed || f.performedIds?.has(e.id))
    .filter((e) => !f.onlyWithPhoto || (e.photos?.length ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pl") * (f.desc ? -1 : 1));
}
