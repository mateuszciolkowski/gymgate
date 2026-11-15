import { eq } from "drizzle-orm";
import { pendingNotes } from "../schema";
import type { Db } from "../types";

export const normalizeNote = (note: string | null | undefined): string | null => {
  const n = note?.trim();
  return n ? n : null;
};

/** Server `syncPendingNoteForExercise`: empty -> clear, otherwise upsert the trimmed note. */
export function syncPendingNote(tx: Db, newId: () => string, exerciseId: string, note: string | null | undefined, at: string): void {
  const normalized = normalizeNote(note);
  if (!normalized) {
    tx.delete(pendingNotes).where(eq(pendingNotes.exerciseId, exerciseId)).run();
    return;
  }
  tx.insert(pendingNotes)
    .values({ id: newId(), exerciseId, note: normalized, updatedAt: at })
    .onConflictDoUpdate({ target: pendingNotes.exerciseId, set: { note: normalized, updatedAt: at } })
    .run();
}

/** Consumes the carry-over note: returns it and deletes the row (item.add). */
export function takePendingNote(tx: Db, exerciseId: string): string | null {
  const row = tx.select().from(pendingNotes).where(eq(pendingNotes.exerciseId, exerciseId)).get();
  if (!row) return null;
  tx.delete(pendingNotes).where(eq(pendingNotes.exerciseId, exerciseId)).run();
  return row.note;
}

export function getPendingNote(db: Db, exerciseId: string): string | null {
  return db.select().from(pendingNotes).where(eq(pendingNotes.exerciseId, exerciseId)).get()?.note ?? null;
}
