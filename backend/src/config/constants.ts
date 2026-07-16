// Convention for a "global" exercise creator: legacy id "1" or null.
// Public plans may contain only such exercises.
export const BUILT_IN_USER_ID = "1";

export const isGlobalCreatorId = (creatorUserId: string | null): boolean =>
  creatorUserId === null || creatorUserId === BUILT_IN_USER_ID;
