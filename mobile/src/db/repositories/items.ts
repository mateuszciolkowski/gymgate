import { eq, max } from "drizzle-orm";
import { workoutItems, workoutSets, exercises } from "../schema";
import { act, type Ctx, type Db } from "../types";
import { emit, NotFoundLocalError } from "./common";
import { syncPendingNote, takePendingNote } from "./notes";
import { requireWorkout } from "./workouts";

type ItemRow = typeof workoutItems.$inferSelect;

/**
 * Adds an exercise with NO sets (the first set is a UI draft). The carry-over note moves from
 * pending_notes into `previous_note` in the same transaction (server addExerciseToWorkoutWithPendingNote).
 */
export function addItem(ctx: Ctx, workoutId: string, exerciseId: string): ItemRow {
  return act(ctx, (tx, at) => {
    requireWorkout(tx, workoutId);
    if (!tx.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, exerciseId)).get()) {
      throw new NotFoundLocalError("Exercise not found");
    }
    const maxOrder = tx.select({ m: max(workoutItems.orderInWorkout) }).from(workoutItems).where(eq(workoutItems.workoutId, workoutId)).get()?.m ?? 0;
    const row: ItemRow = {
      id: ctx.newId(),
      workoutId,
      exerciseId,
      orderInWorkout: maxOrder + 1,
      notes: null,
      previousNote: takePendingNote(tx, exerciseId),
      createdAt: at,
      updatedAt: at,
    };
    tx.insert(workoutItems).values(row).run();
    emit(ctx, tx, at, "item.add", "item", row.id, { id: row.id, workoutId, exerciseId, orderInWorkout: row.orderInWorkout });
    return row;
  });
}

/** Every notes change also upserts (or clears) the pending carry-over note, like the server. */
export function updateItemNotes(ctx: Ctx, itemId: string, notes: string | null): void {
  act(ctx, (tx, at) => {
    const item = requireItem(tx, itemId);
    tx.update(workoutItems).set({ notes, updatedAt: at }).where(eq(workoutItems.id, itemId)).run();
    syncPendingNote(tx, ctx.newId, item.exerciseId, notes, at);
    emit(ctx, tx, at, "item.update", "item", itemId, { id: itemId, notes });
  });
}

export function deleteItem(ctx: Ctx, itemId: string): void {
  act(ctx, (tx, at) => {
    requireItem(tx, itemId);
    deleteItemRows(tx, itemId);
    emit(ctx, tx, at, "item.delete", "item", itemId, { id: itemId });
  });
}

export function deleteItemRows(tx: Db, itemId: string): void {
  tx.delete(workoutSets).where(eq(workoutSets.itemId, itemId)).run();
  tx.delete(workoutItems).where(eq(workoutItems.id, itemId)).run();
}

export function requireItem(db: Db, id: string): ItemRow {
  const row = db.select().from(workoutItems).where(eq(workoutItems.id, id)).get();
  if (!row) throw new NotFoundLocalError("Pozycja treningowa nie znaleziona");
  return row;
}
