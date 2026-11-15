import { db, runInTx } from "../../config/txContext.js";
import type { Prisma, WorkoutPlanVersion } from "@prisma/client";
import type { PlanTab } from "./plan.schema.js";
import type { WriteStamp } from "../workout/workout.repository.js";
import {
  toSnapshot,
  versionsToRecord,
  type PlanSnapshot,
  type PlanSnapshotExercise,
} from "./plan.history.js";

const itemsInclude = {
  items: {
    include: { exercise: true },
    orderBy: { orderInPlan: "asc" as const },
  },
};

function favoritedByInclude(userId: string) {
  return {
    favoritedBy: {
      where: { userId },
      select: { id: true },
    },
  };
}

type PlanWithFavoriteRaw = Prisma.WorkoutPlanGetPayload<{
  include: {
    items: { include: { exercise: true } };
    favoritedBy: { select: { id: true } };
  };
}>;

export type PlanDto = Omit<PlanWithFavoriteRaw, "favoritedBy"> & { isFavorite: boolean };

function toDto(plan: PlanWithFavoriteRaw): PlanDto {
  const { favoritedBy, ...rest } = plan;
  return { ...rest, isFavorite: favoritedBy.length > 0 };
}

function versionData(snapshot: PlanSnapshot) {
  return { ...snapshot, exercises: snapshot.exercises as unknown as Prisma.InputJsonValue };
}

function fromVersionRow(row: WorkoutPlanVersion): PlanSnapshot & { version: number } {
  return {
    version: row.version,
    name: row.name,
    shortName: row.shortName,
    isPublic: row.isPublic,
    exercises: row.exercises as unknown as PlanSnapshotExercise[],
  };
}

export class PlanRepository {
  async findAll(tab: PlanTab, userId: string) {
    const where =
      tab === "mine"
        ? { creatorUserId: userId }
        : tab === "builtin"
          ? { creatorUserId: null }
          : {
              isPublic: true,
              creatorUserId: { not: null },
              NOT: { creatorUserId: userId },
            };

    const plans = await db().workoutPlan.findMany({
      where,
      include: { ...itemsInclude, ...favoritedByInclude(userId) },
      orderBy: { createdAt: "desc" },
    });

    return plans.map(toDto);
  }

  async findById(id: string, userId?: string) {
    const plan = await db().workoutPlan.findUnique({
      where: { id },
      include: {
        ...itemsInclude,
        ...(userId ? favoritedByInclude(userId) : {}),
      },
    });

    if (!plan) return null;
    return userId ? toDto(plan) : plan;
  }

  async create(data: {
    name: string;
    shortName?: string | null | undefined;
    creatorUserId: string | null;
    isPublic: boolean;
    exerciseIds: string[];
  }, stamp?: WriteStamp) {
    const plan = await runInTx(async (tx) => {
      const created = await tx.workoutPlan.create({
        data: {
          name: data.name,
          shortName: data.shortName ?? null,
          creatorUserId: data.creatorUserId,
          isPublic: data.isPublic,
          ...(stamp?.id !== undefined && { id: stamp.id }),
          ...(stamp?.createdAt !== undefined && { createdAt: stamp.createdAt }),
          ...(stamp?.updatedAt !== undefined && { updatedAt: stamp.updatedAt }),
          items: {
            create: data.exerciseIds.map((exerciseId, index) => ({
              exerciseId,
              orderInPlan: index,
            })),
          },
        },
        include: itemsInclude,
      });
      await tx.workoutPlanVersion.create({
        data: { planId: created.id, version: 1, ...versionData(toSnapshot(created)) },
      });
      return created;
    });
    return { ...plan, isFavorite: false };
  }

  async update(
    id: string,
    data: {
      name?: string | undefined;
      shortName?: string | null | undefined;
      creatorUserId?: string | null | undefined;
      isPublic?: boolean | undefined;
      exerciseIds?: string[] | undefined;
    },
    userId: string,
    stamp?: WriteStamp,
  ) {
    const plan = await runInTx(async (tx) => {
      const before = await tx.workoutPlan.findUniqueOrThrow({ where: { id }, include: itemsInclude });

      if (data.exerciseIds) {
        await tx.workoutPlanItem.deleteMany({ where: { planId: id } });
        await tx.workoutPlanItem.createMany({
          data: data.exerciseIds.map((exerciseId, index) => ({
            planId: id,
            exerciseId,
            orderInPlan: index,
          })),
        });
      }

      const updated = await tx.workoutPlan.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.shortName !== undefined && { shortName: data.shortName }),
          ...(data.creatorUserId !== undefined && { creatorUserId: data.creatorUserId }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(stamp?.updatedAt !== undefined && { updatedAt: stamp.updatedAt }),
        },
        include: { ...itemsInclude, ...favoritedByInclude(userId) },
      });

      // ponytail: concurrent edits of one plan can collide on (planId, version) -> P2002 -> 409; fine for single-author plans
      const latest = await tx.workoutPlanVersion.findFirst({
        where: { planId: id },
        orderBy: { version: "desc" },
      });
      const rows = versionsToRecord(before, updated, latest && fromVersionRow(latest));
      if (rows.length > 0) {
        await tx.workoutPlanVersion.createMany({
          data: rows.map(({ version, createdAt, ...snapshot }) => ({
            planId: id,
            version,
            ...(createdAt && { createdAt }),
            ...versionData(snapshot),
          })),
        });
      }

      return updated;
    });

    return toDto(plan);
  }

  async findVersions(planId: string) {
    const rows = await db().workoutPlanVersion.findMany({
      where: { planId },
      orderBy: { version: "desc" },
    });
    return rows.map((row) => ({ ...fromVersionRow(row), createdAt: row.createdAt }));
  }

  async delete(id: string) {
    return db().workoutPlan.delete({ where: { id } });
  }

  async findExercisesByIds(ids: string[]) {
    return db().exercise.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, creatorUserId: true },
    });
  }

  async findByCreatorAndName(creatorUserId: string | null, name: string) {
    return db().workoutPlan.findFirst({
      where: { creatorUserId, name },
    });
  }

  async addFavorite(userId: string, planId: string) {
    await db().userFavoritePlan.upsert({
      where: { userId_planId: { userId, planId } },
      create: { userId, planId },
      update: {},
    });
  }

  async removeFavorite(userId: string, planId: string) {
    await db().userFavoritePlan.deleteMany({
      where: { userId, planId },
    });
  }
}
