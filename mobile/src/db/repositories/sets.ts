import { eq, max } from "drizzle-orm";
import { normalizeWeight } from "../../domain/weight";
import { validateReps, validateSet, validateWeight } from "../../domain/validation";
import { workoutSets } from "../schema";
import { act, type Ctx, type Db } from "../types";
import { emit, NotFoundLocalError } from "./common";
import { requireItem } from "./items";

type SetRow = typeof workoutSets.$inferSelect;

/** Set number = max + 1 on this device (D-33). Weight is stored and sent as canonical decimal text. */
export function addSet(ctx: Ctx, itemId: string, input: { weight: string | number; repetitions: number }): SetRow {
  validateSet(input.weight, input.repetitions);
  return act(ctx, (tx, at) => {
    requireItem(tx, itemId);
    const maxNo = tx.select({ m: max(workoutSets.setNumber) }).from(workoutSets).where(eq(workoutSets.itemId, itemId)).get()?.m ?? 0;
    const row: SetRow = {
      id: ctx.newId(),
      itemId,
      setNumber: maxNo + 1,
      weight: normalizeWeight(input.weight),
      repetitions: input.repetitions,
      createdAt: at,
      updatedAt: at,
    };
    tx.insert(workoutSets).values(row).run();
    emit(ctx, tx, at, "set.add", "set", row.id, {
      id: row.id,
      itemId,
      setNumber: row.setNumber,
      weight: row.weight,
      repetitions: row.repetitions,
    });
    return row;
  });
}

export function updateSet(ctx: Ctx, id: string, patch: { weight?: string | number; repetitions?: number }): void {
  act(ctx, (tx, at) => {
    requireSet(tx, id);
    if (patch.weight !== undefined) validateWeight(patch.weight);
    if (patch.repetitions !== undefined) validateReps(patch.repetitions);
    const fields = {
      ...(patch.weight !== undefined && { weight: normalizeWeight(patch.weight) }),
      ...(patch.repetitions !== undefined && { repetitions: patch.repetitions }),
    };
    tx.update(workoutSets).set({ ...fields, updatedAt: at }).where(eq(workoutSets.id, id)).run();
    emit(ctx, tx, at, "set.update", "set", id, { id, ...fields });
  });
}

export function deleteSet(ctx: Ctx, id: string): void {
  act(ctx, (tx, at) => {
    requireSet(tx, id);
    tx.delete(workoutSets).where(eq(workoutSets.id, id)).run();
    emit(ctx, tx, at, "set.delete", "set", id, { id });
  });
}

function requireSet(db: Db, id: string): SetRow {
  const row = db.select().from(workoutSets).where(eq(workoutSets.id, id)).get();
  if (!row) throw new NotFoundLocalError("Nie znaleziono serii");
  return row;
}
