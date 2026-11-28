import { Prisma } from "@prisma/client";
import { db } from "../../config/txContext.js";

/** Prisma / SQL queries for GET /api/sync/pull. No business rules here. */

export interface ChangeRow {
  seq: bigint;
  txid: bigint;
  entity: string;
  entityId: string;
}

/**
 * Journal rows after (txid, seq) that are visible to `userId`, bounded by the xmin of the
 * statement's own snapshot. Every transaction with an id below xmin has finished, so a
 * concurrently running transaction (id >= xmin) can never be skipped: its rows are withheld
 * until it commits and are then returned by a later pull.
 *
 * xmin comes from the SAME statement as the rows (a separate query would see a newer snapshot
 * and could advance the cursor past a transaction that committed in between). The LEFT JOIN
 * guarantees one result row even when there are no changes.
 */
export const readChanges = async (userId: string, txid: bigint, seq: bigint, limit: number) => {
  const rows = await db().$queryRaw<Array<{ xmin: bigint; seq: bigint | null; txid: bigint | null; entity: string | null; entityId: string | null }>>(
    Prisma.sql`
      WITH s AS (SELECT (pg_snapshot_xmin(pg_current_snapshot())::text)::bigint AS xmin)
      SELECT s.xmin, c."seq", c."txid", c."entity", c."entityId"
      FROM s
      LEFT JOIN LATERAL (
        SELECT "seq", "txid", "entity", "entityId"
        FROM "sync_changes"
        WHERE ("scopeUserId" IS NULL OR "scopeUserId" = ${userId})
          AND ("txid", "seq") > (${txid}, ${seq})
          AND "txid" < s.xmin
        ORDER BY "txid", "seq"
        LIMIT ${limit}
      ) c ON TRUE
      ORDER BY c."txid", c."seq"`,
  );
  const xmin = rows[0]!.xmin;
  const changes: ChangeRow[] = rows.flatMap((r) =>
    r.seq === null ? [] : [{ seq: r.seq, txid: r.txid as bigint, entity: r.entity as string, entityId: r.entityId as string }],
  );
  return { xmin, changes };
};

export const currentXmin = async (): Promise<bigint> => {
  const rows = await db().$queryRaw<Array<{ xmin: bigint }>>`SELECT (pg_snapshot_xmin(pg_current_snapshot())::text)::bigint AS xmin`;
  return rows[0]!.xmin;
};

/** Journal / operation retention (PLAN 5.4): rows older than the cutoff are deleted. */
export const purgeChangesBefore = async (cutoff: Date) =>
  (await db().syncChange.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;

export const purgeOperationsBefore = async (cutoff: Date) =>
  (await db().syncOperation.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;

// ---- flat row selects (shapes a flat client DB needs; clientId is never exposed) ----------

const workoutSelect = {
  id: true, userId: true, workoutDate: true, status: true, workoutName: true, gymName: true,
  location: true, workoutNotes: true, durationSeconds: true, workoutPlanId: true,
  skippedPlanExerciseIds: true, createdAt: true, updatedAt: true,
} as const;

const itemSelect = {
  id: true, workoutId: true, exerciseId: true, orderInWorkout: true, notes: true, previousNote: true,
  createdAt: true, updatedAt: true,
} as const;

const setSelect = {
  id: true, itemId: true, setNumber: true, weight: true, repetitions: true, createdAt: true, updatedAt: true,
} as const;

const exerciseSelect = {
  id: true, name: true, muscleGroups: true, description: true, creatorUserId: true, createdAt: true, updatedAt: true,
  photos: { select: { id: true, photoStage: true, photoUrl: true }, orderBy: { photoStage: "asc" } },
} as const;

const planSelect = {
  id: true, name: true, shortName: true, creatorUserId: true, isPublic: true, createdAt: true, updatedAt: true,
  items: { select: { id: true, exerciseId: true, orderInPlan: true }, orderBy: { orderInPlan: "asc" } },
} as const;

// Visibility rules (same as the existing endpoints).
const visibleExercise = (userId: string): Prisma.ExerciseWhereInput => ({
  OR: [{ creatorUserId: null }, { creatorUserId: "1" }, { creatorUserId: userId }],
});
const visiblePlan = (userId: string): Prisma.WorkoutPlanWhereInput => ({
  OR: [{ creatorUserId: userId }, { creatorUserId: null }, { isPublic: true }],
});

export const findWorkouts = (userId: string, ids: string[]) =>
  db().workout.findMany({ where: { id: { in: ids }, userId }, select: workoutSelect });

export const findItems = (userId: string, ids: string[]) =>
  db().workoutItem.findMany({ where: { id: { in: ids }, workout: { userId } }, select: itemSelect });

export const findSets = (userId: string, ids: string[]) =>
  db().workoutSet.findMany({ where: { id: { in: ids }, item: { workout: { userId } } }, select: setSelect });

export const findExercises = (userId: string, ids?: string[]) =>
  db().exercise.findMany({
    where: { AND: [visibleExercise(userId), ...(ids ? [{ id: { in: ids } }] : [])] },
    select: exerciseSelect,
    orderBy: { id: "asc" },
  });

export const findPlans = (userId: string, ids?: string[]) =>
  db().workoutPlan.findMany({
    where: { AND: [visiblePlan(userId), ...(ids ? [{ id: { in: ids } }] : [])] },
    select: planSelect,
    orderBy: { id: "asc" },
  });

export const findFavoritePlanIds = async (userId: string, planIds?: string[]) =>
  new Set(
    (
      await db().userFavoritePlan.findMany({
        where: { userId, ...(planIds ? { planId: { in: planIds } } : {}) },
        select: { planId: true },
      })
    ).map((f) => f.planId),
  );

export const findPendingNotes = (userId: string, exerciseIds?: string[]) =>
  db().exercisePendingNote.findMany({
    where: { userId, ...(exerciseIds ? { exerciseId: { in: exerciseIds } } : {}) },
    select: { exerciseId: true, note: true, updatedAt: true },
    orderBy: { exerciseId: "asc" },
  });

export const findProfile = (userId: string) =>
  db().user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, isAdmin: true, activeWorkoutId: true },
  });

/** One page of the initial snapshot: own workouts ordered by id, strictly after `afterId`. */
export const findWorkoutPage = (userId: string, afterId: string | null, take: number) =>
  db().workout.findMany({
    where: { userId, ...(afterId ? { id: { gt: afterId } } : {}) },
    select: workoutSelect,
    orderBy: { id: "asc" },
    take,
  });

export const findItemsOfWorkouts = (workoutIds: string[]) =>
  db().workoutItem.findMany({ where: { workoutId: { in: workoutIds } }, select: itemSelect, orderBy: { id: "asc" } });

export const findSetsOfItems = (itemIds: string[]) =>
  db().workoutSet.findMany({ where: { itemId: { in: itemIds } }, select: setSelect, orderBy: { id: "asc" } });
