import prisma from "../../config/database.js";
import type { Prisma } from "@prisma/client";

interface ProgressionQueryFilters {
  from?: Date;
  to?: Date;
}

export interface ExerciseProgressionPoint {
  workoutId: string;
  workoutDate: Date;
  maxSetWeight: number;
  repetitionsAtMaxSet: number;
  volume: number;
}

export const createWorkout = (data: Prisma.WorkoutCreateInput) => {
  return prisma.workout.create({
    data,
    include: {
      items: {
        include: {
          exercise: true,
          sets: true,
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

export const findWorkoutById = (id: string) => {
  return prisma.workout.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          exercise: {
            include: {
              photos: true,
            },
          },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

export const findWorkoutsByUser = (
  userId: string,
  filters?: { status?: "DRAFT" | "COMPLETED"; limit?: number; offset?: number }
) => {
  return prisma.workout.findMany({
    where: {
      userId,
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      items: {
        include: {
          exercise: true,
          sets: true,
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
    orderBy: { workoutDate: "desc" },
    ...(filters?.limit && { take: filters.limit }),
    ...(filters?.offset !== undefined && { skip: filters.offset }),
  });
};

export const updateWorkout = (id: string, data: Prisma.WorkoutUpdateInput) => {
  return prisma.workout.update({
    where: { id },
    data,
    include: {
      items: {
        include: {
          exercise: true,
          sets: true,
        },
        orderBy: { orderInWorkout: "asc" },
      },
    },
  });
};

export const deleteWorkout = (id: string) => {
  return prisma.$transaction(async (tx) => {
    await tx.workoutSet.deleteMany({
      where: {
        item: {
          workoutId: id,
        },
      },
    });

    await tx.workoutItem.deleteMany({
      where: { workoutId: id },
    });

    return tx.workout.delete({
      where: { id },
    });
  });
};

export const addExerciseToWorkout = (
  workoutId: string,
  exerciseId: string,
  orderInWorkout: number,
  notes?: string
) => {
  return prisma.workoutItem.create({
    data: {
      workoutId,
      exerciseId,
      orderInWorkout,
      notes: notes ?? null,
    },
    include: {
      exercise: {
        include: {
          photos: true,
        },
      },
      sets: true,
    },
  });
};

export const findWorkoutItemById = (id: string) => {
  return prisma.workoutItem.findUnique({
    where: { id },
    include: {
      exercise: true,
      sets: {
        orderBy: { setNumber: "asc" },
      },
    },
  });
};

export const updateWorkoutItem = (
  id: string,
  data: Prisma.WorkoutItemUpdateInput
) => {
  return prisma.workoutItem.update({
    where: { id },
    data,
    include: {
      exercise: true,
      sets: true,
    },
  });
};

export const deleteWorkoutItem = (id: string) => {
  return prisma.workoutItem.delete({
    where: { id },
  });
};

export const getMaxOrderInWorkout = async (
  workoutId: string
): Promise<number> => {
  const result = await prisma.workoutItem.aggregate({
    where: { workoutId },
    _max: { orderInWorkout: true },
  });
  return result._max.orderInWorkout || 0;
};

export const addSetToWorkoutItem = (
  itemId: string,
  weight: number,
  repetitions: number,
  setNumber: number
) => {
  return prisma.workoutSet.create({
    data: {
      itemId,
      weight,
      repetitions,
      setNumber,
    },
  });
};

export const findWorkoutSetById = (id: string) => {
  return prisma.workoutSet.findUnique({
    where: { id },
  });
};

export const updateWorkoutSet = (
  id: string,
  data: Prisma.WorkoutSetUpdateInput
) => {
  return prisma.workoutSet.update({
    where: { id },
    data,
  });
};

export const deleteWorkoutSet = (id: string) => {
  return prisma.workoutSet.delete({
    where: { id },
  });
};

export const getMaxSetNumber = async (itemId: string): Promise<number> => {
  const result = await prisma.workoutSet.aggregate({
    where: { itemId },
    _max: { setNumber: true },
  });
  return result._max.setNumber || 0;
};

export const getExerciseStats = (userId: string, exerciseId: string) => {
  return prisma.exerciseUserStats.findUnique({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
  });
};

export const getAllUserStats = (userId: string) => {
  return prisma.exerciseUserStats.findMany({
    where: { userId },
    include: {
      exercise: true,
    },
    orderBy: { maxWeight: "desc" },
  });
};

export const getStatsOverview = async (userId: string) => {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const [workoutsLastMonth, workoutsLastYear, totalSets, totalVolumeRows] =
    await Promise.all([
      prisma.workout.count({
        where: {
          userId,
          status: "COMPLETED",
          workoutDate: { gte: monthAgo },
        },
      }),
      prisma.workout.count({
        where: {
          userId,
          status: "COMPLETED",
          workoutDate: { gte: yearAgo },
        },
      }),
      prisma.workoutSet.count({
        where: {
          item: {
            workout: {
              userId,
              status: "COMPLETED",
            },
          },
        },
      }),
      prisma.$queryRaw<Array<{ totalVolume: string | number | null }>>`
        SELECT COALESCE(SUM(CAST(ws."weight" AS numeric) * ws."repetitions"), 0) AS "totalVolume"
        FROM "workout_sets" ws
        INNER JOIN "workout_items" wi ON wi."id" = ws."itemId"
        INNER JOIN "workouts" w ON w."id" = wi."workoutId"
        WHERE w."userId" = ${userId}
          AND w."status" = 'COMPLETED'
      `,
    ]);

  const totalVolumeRaw = totalVolumeRows[0]?.totalVolume ?? 0;
  const totalVolume = Number(totalVolumeRaw);

  return {
    workoutsLastMonth,
    workoutsLastYear,
    totalSets,
    totalVolume,
  };
};

export const getExerciseProgression = async (
  userId: string,
  exerciseId: string,
  filters?: ProgressionQueryFilters,
): Promise<ExerciseProgressionPoint[]> => {
  const sets = await prisma.workoutSet.findMany({
    where: {
      item: {
        exerciseId,
        workout: {
          userId,
          status: "COMPLETED",
          ...(filters?.from || filters?.to
            ? {
                workoutDate: {
                  ...(filters.from ? { gte: filters.from } : {}),
                  ...(filters.to ? { lte: filters.to } : {}),
                },
              }
            : {}),
        },
      },
    },
    select: {
      weight: true,
      repetitions: true,
      item: {
        select: {
          workout: {
            select: {
              id: true,
              workoutDate: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        item: {
          workout: {
            workoutDate: "asc",
          },
        },
      },
    ],
  });

  const byWorkout = new Map<string, ExerciseProgressionPoint>();

  for (const set of sets) {
    const workoutId = set.item.workout.id;
    const weight = Number(set.weight);
    const repetitions = set.repetitions;
    const setVolume = weight * repetitions;
    const existing = byWorkout.get(workoutId);

    if (!existing) {
      byWorkout.set(workoutId, {
        workoutId,
        workoutDate: set.item.workout.workoutDate,
        maxSetWeight: weight,
        repetitionsAtMaxSet: repetitions,
        volume: setVolume,
      });
      continue;
    }

    existing.volume += setVolume;
    if (weight > existing.maxSetWeight) {
      existing.maxSetWeight = weight;
      existing.repetitionsAtMaxSet = repetitions;
    }
  }

  return [...byWorkout.values()].sort(
    (a, b) => a.workoutDate.getTime() - b.workoutDate.getTime(),
  );
};

export const upsertExerciseStats = (
  userId: string,
  exerciseId: string,
  data: {
    maxWeight: number;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: number;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts?: number;
  }
) => {
  return prisma.exerciseUserStats.upsert({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
    create: {
      userId,
      exerciseId,
      ...data,
      totalWorkouts: data.totalWorkouts || 1,
    },
    update: data,
  });
};

export const deleteExerciseStats = (userId: string, exerciseId: string) => {
  return prisma.exerciseUserStats.deleteMany({
    where: {
      userId,
      exerciseId,
    },
  });
};

export const setActiveWorkout = (userId: string, workoutId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { activeWorkoutId: workoutId },
  });
};

export const getActiveWorkout = (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkoutId: true },
  });
};

export const clearActiveWorkout = (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { activeWorkoutId: null },
  });
};
