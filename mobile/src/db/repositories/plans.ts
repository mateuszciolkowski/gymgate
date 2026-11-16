import { and, asc, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import type { WorkoutPlan } from "../../domain/types";
import {
  assertPublicPlanExercises,
  freeCopyName,
  planNameTakenMessage,
  validatePlanExerciseIds,
  validatePlanName,
  ValidationError,
} from "../../domain/validation";
import { exercises, planItems, plans, workouts } from "../schema";
import { act, type Ctx, type Db } from "../types";
import { emit, inChunks, NotFoundLocalError } from "./common";
import { getProfile } from "./profile";

export type PlanTab = "mine" | "builtin" | "community";
type PlanRow = typeof plans.$inferSelect;

// ---- reads ----

function hydrate(db: Db, rows: PlanRow[]): WorkoutPlan[] {
  const items = inChunks(
    rows.map((r) => r.id),
    (c) => db.select().from(planItems).where(inArray(planItems.planId, c)).orderBy(asc(planItems.orderInPlan)).all(),
  );
  const exs = new Map(
    inChunks([...new Set(items.map((i) => i.exerciseId))], (c) => db.select().from(exercises).where(inArray(exercises.id, c)).all()).map((e) => [e.id, e]),
  );
  return rows.map((r) => ({
    ...r,
    items: items
      .filter((i) => i.planId === r.id)
      .map((i) => ({
        ...i,
        exercise: { id: i.exerciseId, name: exs.get(i.exerciseId)?.name ?? "", muscleGroups: exs.get(i.exerciseId)?.muscleGroups ?? [] },
      })),
  }));
}

/** Tabs exactly like GET /api/plans?tab=: own / built-in (creator null) / public plans of others. Newest first. */
export function listPlans(db: Db, tab: PlanTab, userId: string): WorkoutPlan[] {
  const where =
    tab === "mine"
      ? eq(plans.creatorUserId, userId)
      : tab === "builtin"
        ? isNull(plans.creatorUserId)
        : and(eq(plans.isPublic, true), ne(plans.creatorUserId, userId));
  return hydrate(db, db.select().from(plans).where(where).orderBy(desc(plans.createdAt)).all());
}

/** Every plan visible to the user (own, built-in, public of others); the plans screen splits it into tabs like the PWA. */
export function listAllPlans(db: Db): WorkoutPlan[] {
  return hydrate(db, db.select().from(plans).orderBy(desc(plans.createdAt)).all());
}

export function getPlan(db: Db, id: string): WorkoutPlan | null {
  const row = db.select().from(plans).where(eq(plans.id, id)).get();
  return row ? (hydrate(db, [row])[0] ?? null) : null;
}

/** Favorites first then built-in, for the new-workout dropdown. */
export function listPlansForWorkoutPicker(db: Db, userId: string): WorkoutPlan[] {
  const rows = db
    .select()
    .from(plans)
    .where(or(eq(plans.isFavorite, true), isNull(plans.creatorUserId)))
    .orderBy(desc(plans.isFavorite), desc(plans.createdAt))
    .all();
  void userId;
  return hydrate(db, rows);
}

// ---- writes ----

const canModify = (plan: { creatorUserId: string | null }, userId: string, isAdmin: boolean) =>
  plan.creatorUserId === userId || (isAdmin && plan.creatorUserId === null);

function nameTaken(db: Db, creatorUserId: string | null, name: string, exceptId?: string): boolean {
  const rows = db
    .select({ id: plans.id })
    .from(plans)
    .where(and(creatorUserId === null ? isNull(plans.creatorUserId) : eq(plans.creatorUserId, creatorUserId), eq(plans.name, name)))
    .all();
  return rows.some((r) => r.id !== exceptId);
}

function loadExercises(db: Db, ids: string[]) {
  const found = inChunks(ids, (c) => db.select().from(exercises).where(inArray(exercises.id, c)).all());
  if (found.length !== ids.length) {
    const have = new Set(found.map((e) => e.id));
    throw new ValidationError(`Exercises not found: ${ids.filter((i) => !have.has(i)).join(", ")}`);
  }
  return found;
}

function writeItems(tx: Db, ctx: Ctx, planId: string, exerciseIds: string[]): void {
  tx.delete(planItems).where(eq(planItems.planId, planId)).run();
  exerciseIds.forEach((exerciseId, orderInPlan) => {
    tx.insert(planItems).values({ id: ctx.newId(), planId, exerciseId, orderInPlan }).run();
  });
}

export interface CreatePlanInput {
  name: string;
  shortName?: string | null;
  exerciseIds: string[];
  isPublic: boolean;
  isGlobal?: boolean;
}

export function createPlan(ctx: Ctx, input: CreatePlanInput): WorkoutPlan {
  const name = input.name.trim();
  validatePlanName(name);
  validatePlanExerciseIds(input.exerciseIds);
  return act(ctx, (tx, at) => {
    const isAdmin = getProfile(tx)?.isAdmin ?? false;
    if (input.isGlobal && !isAdmin) throw new ValidationError("Only admins can create global plans");
    const creatorUserId = input.isGlobal ? null : ctx.userId;
    const isPublic = input.isGlobal ? true : input.isPublic;
    const exs = loadExercises(tx, input.exerciseIds);
    if (isPublic) assertPublicPlanExercises(exs);
    if (nameTaken(tx, creatorUserId, name)) throw new ValidationError(planNameTakenMessage(creatorUserId === null));

    const id = ctx.newId();
    const shortName = input.shortName?.trim() || null;
    tx.insert(plans).values({ id, name, shortName, creatorUserId, isPublic, isFavorite: false, createdAt: at, updatedAt: at }).run();
    writeItems(tx, ctx, id, input.exerciseIds);
    emit(ctx, tx, at, "plan.create", "plan", id, {
      id,
      name,
      ...(shortName && { shortName }),
      exerciseIds: input.exerciseIds,
      isPublic: input.isPublic,
      ...(input.isGlobal && { isGlobal: true }),
    });
    return getPlan(tx, id)!;
  });
}

export interface UpdatePlanInput {
  name?: string;
  shortName?: string | null;
  exerciseIds?: string[];
  isPublic?: boolean;
  isGlobal?: boolean;
}

export function updatePlan(ctx: Ctx, id: string, patch: UpdatePlanInput): WorkoutPlan {
  const name = patch.name?.trim();
  if (name !== undefined) validatePlanName(name);
  if (patch.exerciseIds) validatePlanExerciseIds(patch.exerciseIds);
  return act(ctx, (tx, at) => {
    const plan = tx.select().from(plans).where(eq(plans.id, id)).get();
    if (!plan) throw new NotFoundLocalError("Plan not found");
    const isAdmin = getProfile(tx)?.isAdmin ?? false;
    if (!canModify(plan, ctx.userId, isAdmin)) throw new ValidationError("You can only edit your own plans");
    if (patch.isGlobal && !isAdmin) throw new ValidationError("Only admins can create global plans");

    const nextCreator = patch.isGlobal !== undefined ? (patch.isGlobal ? null : ctx.userId) : plan.creatorUserId;
    const nextPublic = patch.isGlobal ? true : (patch.isPublic ?? plan.isPublic);
    if (patch.exerciseIds) {
      const exs = loadExercises(tx, patch.exerciseIds);
      if (nextPublic) assertPublicPlanExercises(exs);
    } else if (nextPublic) {
      const current = tx.select({ id: planItems.exerciseId }).from(planItems).where(eq(planItems.planId, id)).all();
      assertPublicPlanExercises(loadExercises(tx, current.map((c) => c.id)));
    }
    if (name !== undefined && name !== plan.name && nameTaken(tx, nextCreator, name)) {
      throw new ValidationError(planNameTakenMessage(nextCreator === null));
    }

    const set = {
      ...(name !== undefined && { name }),
      ...(patch.shortName !== undefined && { shortName: patch.shortName?.trim() || null }),
      ...(patch.isPublic !== undefined && { isPublic: patch.isPublic }),
      ...(patch.isGlobal !== undefined && { creatorUserId: nextCreator, isPublic: true }),
      updatedAt: at,
    };
    tx.update(plans).set(set).where(eq(plans.id, id)).run();
    if (patch.exerciseIds) writeItems(tx, ctx, id, patch.exerciseIds);
    emit(ctx, tx, at, "plan.update", "plan", id, {
      id,
      ...(name !== undefined && { name }),
      ...(patch.shortName !== undefined && { shortName: set.shortName }),
      ...(patch.exerciseIds && { exerciseIds: patch.exerciseIds }),
      ...(patch.isPublic !== undefined && { isPublic: patch.isPublic }),
      ...(patch.isGlobal !== undefined && { isGlobal: patch.isGlobal }),
    });
    return getPlan(tx, id)!;
  });
}

/** Cascade: plan items; workouts keep existing but lose `workout_plan_id` (server onDelete SetNull). */
export function deletePlan(ctx: Ctx, id: string): void {
  act(ctx, (tx, at) => {
    const plan = tx.select().from(plans).where(eq(plans.id, id)).get();
    if (!plan) throw new NotFoundLocalError("Plan not found");
    const isAdmin = getProfile(tx)?.isAdmin ?? false;
    if (!canModify(plan, ctx.userId, isAdmin)) throw new ValidationError("You can only delete your own plans");
    deletePlanRows(tx, id);
    emit(ctx, tx, at, "plan.delete", "plan", id, { id });
  });
}

/** Local cascade only (also used when pull applies a delete). */
export function deletePlanRows(tx: Db, id: string): void {
  tx.delete(planItems).where(eq(planItems.planId, id)).run();
  tx.update(workouts).set({ workoutPlanId: null }).where(eq(workouts.workoutPlanId, id)).run();
  tx.delete(plans).where(eq(plans.id, id)).run();
}

/** Private copy named "X (kopia)", "X (kopia 2)", ... computed here and sent as `name`. */
export function duplicatePlan(ctx: Ctx, sourceId: string): WorkoutPlan {
  return act(ctx, (tx, at) => {
    const source = getPlan(tx, sourceId);
    if (!source) throw new NotFoundLocalError("Plan not found");
    const taken = new Set(tx.select({ n: plans.name }).from(plans).where(eq(plans.creatorUserId, ctx.userId)).all().map((r) => r.n));
    const name = freeCopyName(source.name, taken);
    const id = ctx.newId();
    tx.insert(plans).values({ id, name, shortName: null, creatorUserId: ctx.userId, isPublic: false, isFavorite: false, createdAt: at, updatedAt: at }).run();
    writeItems(
      tx,
      ctx,
      id,
      [...source.items].sort((a, b) => a.orderInPlan - b.orderInPlan).map((i) => i.exerciseId),
    );
    emit(ctx, tx, at, "plan.duplicate", "plan", id, { id, sourceId, name });
    return getPlan(tx, id)!;
  });
}

export function setPlanFavorite(ctx: Ctx, id: string, favorite: boolean): void {
  act(ctx, (tx, at) => {
    const plan = tx.select().from(plans).where(eq(plans.id, id)).get();
    if (!plan) throw new NotFoundLocalError("Plan not found");
    if (plan.isFavorite === favorite) return;
    tx.update(plans).set({ isFavorite: favorite }).where(eq(plans.id, id)).run();
    emit(ctx, tx, at, favorite ? "plan.favorite" : "plan.unfavorite", "plan", id, { id });
  });
}
