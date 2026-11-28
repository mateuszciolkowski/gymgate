/** Prisma include for exercise photos in movement order: START, MIDDLE, END (Postgres enum declaration order). */
export const photosByStage = { orderBy: { photoStage: "asc" } } as const;
