import prisma from "../../config/database.js";
import type { PlanTab } from "./plan.schema.js";

const planInclude = {
  items: {
    include: { exercise: true },
    orderBy: { orderInPlan: "asc" as const },
  },
};

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

    return prisma.workoutPlan.findMany({
      where,
      include: planInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.workoutPlan.findUnique({
      where: { id },
      include: planInclude,
    });
  }

  async create(data: {
    name: string;
    creatorUserId: string;
    isPublic: boolean;
    exerciseIds: string[];
  }) {
    return prisma.workoutPlan.create({
      data: {
        name: data.name,
        creatorUserId: data.creatorUserId,
        isPublic: data.isPublic,
        items: {
          create: data.exerciseIds.map((exerciseId, index) => ({
            exerciseId,
            orderInPlan: index,
          })),
        },
      },
      include: planInclude,
    });
  }

  async update(
    id: string,
    data: {
      name?: string | undefined;
      isPublic?: boolean | undefined;
      exerciseIds?: string[] | undefined;
    },
  ) {
    return prisma.$transaction(async (tx) => {
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
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        },
        include: planInclude,
      });
    });
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
}
