import prisma from "../../config/database.js";
import type { Prisma } from "@prisma/client";

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
  return prisma.workout.delete({
    where: { id },
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
