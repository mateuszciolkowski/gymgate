const STAGE_RANK: Record<string, number> = { START: 0, MIDDLE: 1, END: 2 };

/** Exercise photos in movement order START → MIDDLE → END; unknown stages last, ties keep input order (same rule in the PWA and the app). */
export function sortPhotosByStage<T extends { photoStage: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (STAGE_RANK[a.photoStage] ?? 3) - (STAGE_RANK[b.photoStage] ?? 3));
}
