import { db } from "../../config/txContext.js";
import type { Prisma } from "@prisma/client";

/** Prisma queries for the push pipeline. No business rules here. */

export const findOperation = (opId: string) => db().syncOperation.findUnique({ where: { opId } });

// skipDuplicates: a concurrent writer of the same opId is serialized by the user lock,
// but this keeps the insert harmless if it ever is not.
export const saveOperation = (data: Prisma.SyncOperationUncheckedCreateInput) =>
  db().syncOperation.createMany({ data: [data], skipDuplicates: true });

export const findWorkoutHead = (id: string) =>
  db().workout.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
  });

export const findItemHead = (id: string) =>
  db().workoutItem.findUnique({
    where: { id },
    select: { id: true, updatedAt: true, workout: { select: { userId: true } } },
  });

export const findSetHead = (id: string) =>
  db().workoutSet.findUnique({
    where: { id },
    select: { id: true, updatedAt: true, item: { select: { workout: { select: { userId: true } } } } },
  });

export const findExerciseHead = (id: string) =>
  db().exercise.findUnique({ where: { id }, select: { id: true, creatorUserId: true, updatedAt: true } });

export const findPlanHead = (id: string) =>
  db().workoutPlan.findUnique({
    where: { id },
    select: { id: true, creatorUserId: true, isPublic: true, updatedAt: true },
  });

/** Current server state of a record as the user may see it; null when absent or not visible. */
export const findCurrent = async (
  entity: "workout" | "item" | "set" | "exercise" | "plan",
  id: string,
  userId: string,
): Promise<unknown> => {
  switch (entity) {
    case "workout":
      return db().workout.findFirst({ where: { id, userId }, include: { items: { include: { sets: true } } } });
    case "item":
      return db().workoutItem.findFirst({ where: { id, workout: { userId } }, include: { sets: true } });
    case "set":
      return db().workoutSet.findFirst({ where: { id, item: { workout: { userId } } } });
    case "exercise":
      return db().exercise.findFirst({
        where: { id, OR: [{ creatorUserId: null }, { creatorUserId: "1" }, { creatorUserId: userId }] },
        include: { photos: true },
      });
    case "plan":
      return db().workoutPlan.findFirst({
        where: { id, OR: [{ creatorUserId: userId }, { creatorUserId: null }, { isPublic: true }] },
        include: { items: { orderBy: { orderInPlan: "asc" } } },
      });
  }
};
