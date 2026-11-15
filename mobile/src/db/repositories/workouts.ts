import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { completionError, ValidationError } from "../../domain/validation";
import type { Workout, WorkoutItem, WorkoutSet } from "../../domain/types";
import { exercises, planItems, plans, profile, workoutItems, workoutSets, workouts } from "../schema";
import { act, type Ctx, type Db } from "../types";
import { emit, emptyToNull, forChunks, inChunks, NotFoundLocalError } from "./common";
import { syncPendingNote } from "./notes";
import { setActiveWorkoutPointer } from "./profile";

type WorkoutRow = typeof workouts.$inferSelect;

// ---- reads ----

function hydrate(db: Db, rows: WorkoutRow[]): Workout[] {
  if (rows.length === 0) return [];
  const items = inChunks(
    rows.map((r) => r.id),
    (c) => db.select().from(workoutItems).where(inArray(workoutItems.workoutId, c)).orderBy(asc(workoutItems.orderInWorkout)).all(),
  );
  const sets = inChunks(
    items.map((i) => i.id),
    (c) => db.select().from(workoutSets).where(inArray(workoutSets.itemId, c)).orderBy(asc(workoutSets.setNumber), asc(workoutSets.createdAt)).all(),
  );
  const exs = new Map(
    inChunks(
      [...new Set(items.map((i) => i.exerciseId))],
      (c) => db.select().from(exercises).where(inArray(exercises.id, c)).all(),
    ).map((e) => [e.id, e]),
  );

  const setsByItem = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = setsByItem.get(s.itemId) ?? [];
    list.push(s);
    setsByItem.set(s.itemId, list);
  }
  const itemsByWorkout = new Map<string, WorkoutItem[]>();
  for (const i of items) {
    const ex = exs.get(i.exerciseId);
    const item: WorkoutItem = {
      ...i,
      exercise: {
        id: i.exerciseId,
        // The exercise row can be missing only transiently (pull order); keep the item readable.
        name: ex?.name ?? "",
        muscleGroups: ex?.muscleGroups ?? [],
        description: ex?.description ?? null,
        photos: ex?.photos ?? [],
      },
      sets: setsByItem.get(i.id) ?? [],
    };
    const list = itemsByWorkout.get(i.workoutId) ?? [];
    list.push(item);
    itemsByWorkout.set(i.workoutId, list);
  }
  return rows.map((r) => ({ ...r, items: itemsByWorkout.get(r.id) ?? [] }));
}

/** Like GET /api/workouts: newest `workoutDate` first (creation time breaks same-day ties). */
export function listWorkouts(db: Db, opts: { status?: "DRAFT" | "COMPLETED"; limit?: number; offset?: number } = {}): Workout[] {
  const q = db
    .select()
    .from(workouts)
    .where(opts.status ? eq(workouts.status, opts.status) : undefined)
    .orderBy(desc(workouts.workoutDate), desc(workouts.createdAt))
    .limit(opts.limit ?? -1)
    .offset(opts.offset ?? 0);
  return hydrate(db, q.all());
}

export function getWorkout(db: Db, id: string): Workout | null {
  const row = db.select().from(workouts).where(eq(workouts.id, id)).get();
  return row ? (hydrate(db, [row])[0] ?? null) : null;
}

/**
 * Active workout id with the server's self-healing: a pointer to a missing or COMPLETED workout is cleared.
 * This is a read-time repair of derived state, not a user action (no outbox).
 */
export function getActiveWorkoutId(db: Db): string | null {
  const p = db.select().from(profile).limit(1).get();
  const id = p?.activeWorkoutId;
  if (!p || !id) return null;
  const w = db.select({ status: workouts.status }).from(workouts).where(eq(workouts.id, id)).get();
  if (!w || w.status === "COMPLETED") {
    setActiveWorkoutPointer(db, p.id, null);
    return null;
  }
  return id;
}

export function getActiveWorkout(db: Db): Workout | null {
  const id = getActiveWorkoutId(db);
  return id ? getWorkout(db, id) : null;
}

// ---- writes (PLAN 5.2) ----

export interface CreateWorkoutInput {
  /** ISO datetime; defaults to now. */
  workoutDate?: string;
  workoutName?: string | null;
  gymName?: string | null;
  workoutPlanId?: string | null;
}

/** Always creates a new workout and makes it the active one; an older draft stays a DRAFT (PLAN 5.5). */
export function createWorkout(ctx: Ctx, input: CreateWorkoutInput = {}): Workout {
  return act(ctx, (tx, at) => {
    if (input.workoutPlanId) {
      const plan = tx.select({ id: plans.id }).from(plans).where(eq(plans.id, input.workoutPlanId)).get();
      if (!plan) throw new NotFoundLocalError("Plan not found");
    }
    const id = ctx.newId();
    const row: WorkoutRow = {
      id,
      userId: ctx.userId,
      workoutDate: input.workoutDate ?? at,
      status: "DRAFT",
      workoutName: emptyToNull(input.workoutName),
      gymName: emptyToNull(input.gymName),
      location: null,
      workoutNotes: null,
      durationSeconds: null,
      workoutPlanId: input.workoutPlanId ?? null,
      skippedPlanExerciseIds: [],
      createdAt: at,
      updatedAt: at,
    };
    tx.insert(workouts).values(row).run();
    setActiveWorkoutPointer(tx, ctx.userId, id);
    emit(ctx, tx, at, "workout.create", "workout", id, {
      id,
      workoutDate: row.workoutDate,
      ...(row.workoutName && { workoutName: row.workoutName }),
      ...(row.gymName && { gymName: row.gymName }),
      ...(row.workoutPlanId && { workoutPlanId: row.workoutPlanId }),
      startedAt: at,
    });
    return { ...row, items: [] };
  });
}

export interface UpdateWorkoutInput {
  workoutDate?: string;
  workoutName?: string | null;
  gymName?: string | null;
  workoutNotes?: string | null;
  durationSeconds?: number;
}

export function updateWorkout(ctx: Ctx, id: string, patch: UpdateWorkoutInput): void {
  act(ctx, (tx, at) => {
    requireWorkout(tx, id);
    const fields = {
      ...(patch.workoutDate !== undefined && { workoutDate: patch.workoutDate }),
      ...(patch.workoutName !== undefined && { workoutName: emptyToNull(patch.workoutName) }),
      ...(patch.gymName !== undefined && { gymName: emptyToNull(patch.gymName) }),
      ...(patch.workoutNotes !== undefined && { workoutNotes: emptyToNull(patch.workoutNotes) }),
      ...(patch.durationSeconds !== undefined && { durationSeconds: patch.durationSeconds }),
    };
    tx.update(workouts).set({ ...fields, updatedAt: at }).where(eq(workouts.id, id)).run();
    emit(ctx, tx, at, "workout.update", "workout", id, { id, ...fields });
  });
}

/**
 * Completes a workout: status, pending-note carry-over of every item's note (server `updateWorkout`),
 * clears the active pointer if it points here. `force` skips the completion rule (abandoned-workout dialog, D-24).
 */
export function completeWorkout(ctx: Ctx, id: string, durationSeconds: number, opts: { force?: boolean } = {}): void {
  act(ctx, (tx, at) => {
    const w = getWorkout(tx, id);
    if (!w) throw new NotFoundLocalError("Trening nie znaleziony");
    if (w.status === "COMPLETED") return;
    if (!opts.force) {
      const err = completionError(w);
      if (err) throw new ValidationError(err);
    }
    tx.update(workouts).set({ status: "COMPLETED", durationSeconds, updatedAt: at }).where(eq(workouts.id, id)).run();
    for (const item of w.items) syncPendingNote(tx, ctx.newId, item.exerciseId, item.notes, at);
    const p = tx.select().from(profile).where(eq(profile.id, ctx.userId)).get();
    if (p?.activeWorkoutId === id) setActiveWorkoutPointer(tx, ctx.userId, null);
    emit(ctx, tx, at, "workout.complete", "workout", id, { id, durationSeconds });
  });
}

/** Cascade: items and their sets. Clears the active pointer if it points here. */
export function deleteWorkout(ctx: Ctx, id: string): void {
  act(ctx, (tx, at) => {
    deleteWorkoutRows(tx, id);
    const p = tx.select().from(profile).where(eq(profile.id, ctx.userId)).get();
    if (p?.activeWorkoutId === id) setActiveWorkoutPointer(tx, ctx.userId, null);
    emit(ctx, tx, at, "workout.delete", "workout", id, { id });
  });
}

/** Local cascade only (also used when pull applies a delete). */
export function deleteWorkoutRows(tx: Db, id: string): void {
  const itemIds = tx.select({ id: workoutItems.id }).from(workoutItems).where(eq(workoutItems.workoutId, id)).all().map((r) => r.id);
  forChunks(itemIds, (c) => tx.delete(workoutSets).where(inArray(workoutSets.itemId, c)).run());
  tx.delete(workoutItems).where(eq(workoutItems.workoutId, id)).run();
  tx.delete(workouts).where(eq(workouts.id, id)).run();
}

export function skipPlanExercise(ctx: Ctx, workoutId: string, exerciseId: string): void {
  act(ctx, (tx, at) => {
    const w = requireWorkout(tx, workoutId);
    if (!w.workoutPlanId) throw new ValidationError("Trening nie jest powiązany z planem");
    const inPlan = tx
      .select({ id: planItems.id })
      .from(planItems)
      .where(and(eq(planItems.planId, w.workoutPlanId), eq(planItems.exerciseId, exerciseId)))
      .get();
    if (!inPlan) throw new ValidationError("Ćwiczenie nie należy do planu tego treningu");
    if (w.skippedPlanExerciseIds.includes(exerciseId)) return;
    tx.update(workouts)
      .set({ skippedPlanExerciseIds: [...w.skippedPlanExerciseIds, exerciseId], updatedAt: at })
      .where(eq(workouts.id, workoutId))
      .run();
    emit(ctx, tx, at, "workout.skipPlanExercise", "workout", workoutId, { id: workoutId, exerciseId });
  });
}

export function requireWorkout(db: Db, id: string): WorkoutRow {
  const w = db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!w) throw new NotFoundLocalError("Trening nie znaleziony");
  return w;
}
