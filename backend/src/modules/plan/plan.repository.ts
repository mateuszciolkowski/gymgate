import prisma from "../../config/database.js";
import type { Prisma } from "@prisma/client";
import type { PlanTab } from "./plan.schema.js";

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

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: { ...itemsInclude, ...favoritedByInclude(userId) },
      orderBy: { createdAt: "desc" },
    });

    return plans.map(toDto);
  }

  async findById(id: string, userId?: string) {
    const plan = await prisma.workoutPlan.findUnique({
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
    shortName?: string | undefined;
    creatorUserId: string;
    isPublic: boolean;
    exerciseIds: string[];
  }) {
    const plan = await prisma.workoutPlan.create({
      data: {
        name: data.name,
        shortName: data.shortName ?? null,
        creatorUserId: data.creatorUserId,
        isPublic: data.isPublic,
        items: {
          create: data.exerciseIds.map((exerciseId, index) => ({
            exerciseId,
            orderInPlan: index,
          })),
        },
      },
      include: itemsInclude,
    });
    return { ...plan, isFavorite: false };
  }

  async update(
    id: string,
    data: {
      name?: string | undefined;
      shortName?: string | undefined;
      isPublic?: boolean | undefined;
      exerciseIds?: string[] | undefined;
    },
    userId: string,
  ) {
    const plan = await prisma.$transaction(async (tx) => {
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

      return tx.workoutPlan.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.shortName !== undefined && { shortName: data.shortName }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        },
        include: { ...itemsInclude, ...favoritedByInclude(userId) },
      });
    });

    return toDto(plan);
  }

  async delete(id: string) {
    return prisma.workoutPlan.delete({ where: { id } });
  }

  async findExercisesByIds(ids: string[]) {
    return prisma.exercise.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, creatorUserId: true },
    });
  }

  async findByCreatorAndName(creatorUserId: string, name: string) {
    return prisma.workoutPlan.findFirst({
      where: { creatorUserId, name },
    });
  }

  async addFavorite(userId: string, planId: string) {
    await prisma.userFavoritePlan.upsert({
      where: { userId_planId: { userId, planId } },
      create: { userId, planId },
      update: {},
    });
  }

  async removeFavorite(userId: string, planId: string) {
    await prisma.userFavoritePlan.deleteMany({
      where: { userId, planId },
    });
  }
}
