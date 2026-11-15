import { desc, eq, inArray } from "drizzle-orm";
import { validateExercise, ValidationError } from "../../domain/validation";
import { exercises, pendingNotes, planItems, workoutItems, workoutSets } from "../schema";
import { act, type Ctx, type Db } from "../types";
import { emit, forChunks, NotFoundLocalError } from "./common";
import { getProfile } from "./profile";

export type ExerciseRow = typeof exercises.$inferSelect;

/** Newest first like GET /api/exercises. */
export function listExercises(db: Db): ExerciseRow[] {
  return db.select().from(exercises).orderBy(desc(exercises.createdAt)).all();
}

export function getExercise(db: Db, id: string): ExerciseRow | null {
  return db.select().from(exercises).where(eq(exercises.id, id)).get() ?? null;
}

export interface CreateExerciseInput {
  name: string;
  muscleGroups: string[];
  description?: string | null;
  /** Admin only: creates a built-in exercise (creator null). */
  isGlobal?: boolean;
}

export function createExercise(ctx: Ctx, input: CreateExerciseInput): ExerciseRow {
  validateExercise(input, "create");
  const isAdmin = getProfile(ctx.db)?.isAdmin ?? false;
  if (input.isGlobal && !isAdmin) throw new ValidationError("Brak uprawnień do tworzenia globalnych ćwiczeń");
  return act(ctx, (tx, at) => {
    const id = ctx.newId();
    const row: ExerciseRow = {
      id,
      name: input.name.trim(),
      muscleGroups: input.muscleGroups,
      description: input.description || null,
      creatorUserId: input.isGlobal ? null : ctx.userId,
      photos: [],
      createdAt: at,
      updatedAt: at,
    };
    tx.insert(exercises).values(row).run();
    emit(ctx, tx, at, "exercise.create", "exercise", id, {
      id,
      name: row.name,
      muscleGroups: row.muscleGroups,
      ...(row.description && { description: row.description }),
      ...(input.isGlobal && { isGlobal: true }),
    });
    return row;
  });
}

export interface UpdateExerciseInput {
  name?: string;
  muscleGroups?: string[];
  description?: string | null;
}

export function updateExercise(ctx: Ctx, id: string, patch: UpdateExerciseInput): ExerciseRow {
  validateExercise(patch, "update");
  return act(ctx, (tx, at) => {
    const current = getExercise(tx, id);
    if (!current) throw new NotFoundLocalError("Exercise not found");
    const isAdmin = getProfile(tx)?.isAdmin ?? false;
    if (!isAdmin && current.creatorUserId !== ctx.userId) {
      throw new ValidationError("Unauthorized: You can only edit your own exercises");
    }
    const set = {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.muscleGroups !== undefined && { muscleGroups: patch.muscleGroups }),
      ...(patch.description !== undefined && { description: patch.description || null }),
      updatedAt: at,
    };
    tx.update(exercises).set(set).where(eq(exercises.id, id)).run();
    const { updatedAt: _u, ...fields } = set;
    emit(ctx, tx, at, "exercise.update", "exercise", id, { id, ...fields });
    return { ...current, ...set };
  });
}

/** What deleting the exercise takes with it (D-10 confirmation text). */
export function exerciseDeleteImpact(db: Db, id: string): { workouts: number; plans: number } {
  const items = db.select({ w: workoutItems.workoutId }).from(workoutItems).where(eq(workoutItems.exerciseId, id)).all();
  const plans = db.select({ p: planItems.planId }).from(planItems).where(eq(planItems.exerciseId, id)).all();
  return { workouts: new Set(items.map((i) => i.w)).size, plans: new Set(plans.map((p) => p.p)).size };
}

/** Cascade like the server: workout items (with sets), plan items, pending note. */
export function deleteExercise(ctx: Ctx, id: string): void {
  act(ctx, (tx, at) => {
    const current = getExercise(tx, id);
    if (!current) throw new NotFoundLocalError("Exercise not found");
    const isAdmin = getProfile(tx)?.isAdmin ?? false;
    if (!isAdmin && current.creatorUserId !== ctx.userId) {
      throw new ValidationError("Unauthorized: You can only delete your own exercises");
    }
    deleteExerciseRows(tx, id);
    emit(ctx, tx, at, "exercise.delete", "exercise", id, { id });
  });
}

/** Local cascade only (also used when pull applies a delete). */
export function deleteExerciseRows(tx: Db, id: string): void {
  const itemIds = tx.select({ id: workoutItems.id }).from(workoutItems).where(eq(workoutItems.exerciseId, id)).all().map((r) => r.id);
  forChunks(itemIds, (c) => tx.delete(workoutSets).where(inArray(workoutSets.itemId, c)).run());
  tx.delete(workoutItems).where(eq(workoutItems.exerciseId, id)).run();
  tx.delete(planItems).where(eq(planItems.exerciseId, id)).run();
  tx.delete(pendingNotes).where(eq(pendingNotes.exerciseId, id)).run();
  tx.delete(exercises).where(eq(exercises.id, id)).run();
}
