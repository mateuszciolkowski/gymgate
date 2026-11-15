import { eq } from "drizzle-orm";
import { profile } from "../schema";
import type { Db } from "../types";

export type Profile = typeof profile.$inferSelect;

export function getProfile(db: Db): Profile | null {
  return db.select().from(profile).limit(1).get() ?? null;
}

/** Upserts the signed-in user (from login or pull). Keeps the local active-workout pointer unless given. */
export function saveProfile(db: Db, p: Omit<Profile, "activeWorkoutId"> & { activeWorkoutId?: string | null }): void {
  const { activeWorkoutId, ...rest } = p;
  db.insert(profile)
    .values({ ...rest, activeWorkoutId: activeWorkoutId ?? null })
    .onConflictDoUpdate({
      target: profile.id,
      set: { ...rest, ...(activeWorkoutId !== undefined && { activeWorkoutId }) },
    })
    .run();
}

export function setActiveWorkoutPointer(tx: Db, userId: string, workoutId: string | null): void {
  tx.update(profile).set({ activeWorkoutId: workoutId }).where(eq(profile.id, userId)).run();
}
