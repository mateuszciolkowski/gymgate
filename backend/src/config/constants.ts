// Konwencja "globalnego" twórcy ćwiczenia: legacy id "1" lub null.
// Plany publiczne mogą zawierać tylko takie ćwiczenia.
export const BUILT_IN_USER_ID = "1";

export const isGlobalCreatorId = (creatorUserId: string | null): boolean =>
  creatorUserId === null || creatorUserId === BUILT_IN_USER_ID;
