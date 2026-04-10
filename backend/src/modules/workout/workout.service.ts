import type {
  CreateWorkoutDto,
  UpdateWorkoutDto,
  AddExerciseToWorkoutDto,
  UpdateWorkoutItemDto,
  CreateWorkoutSetDto,
  UpdateWorkoutSetDto,
  GetWorkoutsQuery,
  GetStatsProgressionQuery,
} from "./workout.schema.js";
import * as workoutRepo from "./workout.repository.js";
import { Prisma } from "@prisma/client";

type StatsProgressMetric = "maxSetWeight" | "volume";

export const createWorkout = async (userId: string, data: CreateWorkoutDto) => {
  const existingActive = await workoutRepo.getActiveWorkout(userId);
  if (existingActive?.activeWorkoutId) {
    const activeWorkout = await workoutRepo.findWorkoutById(
      existingActive.activeWorkoutId
    );
    if (activeWorkout) {
      return activeWorkout;
    }
  }
  const workoutData: Prisma.WorkoutCreateInput = {
    workoutDate: data.workoutDate ? new Date(data.workoutDate) : new Date(),
    workoutName: data.workoutName ?? null,
    gymName: data.gymName ?? null,
    location: data.location ?? null,
    workoutNotes: data.workoutNotes ?? null,
    user: { connect: { id: userId } },
  };
  const workout = await workoutRepo.createWorkout(workoutData);

  await workoutRepo.setActiveWorkout(userId, workout.id);

  return workout;
};

export const getWorkoutById = async (id: string, userId: string) => {
  const workout = await workoutRepo.findWorkoutById(id);
  if (!workout) {
    throw new Error("Trening nie znaleziony");
  }
  if (workout.userId !== userId) {
    throw new Error("Brak uprawnień do tego treningu");
  }
  return workout;
};

export const getUserWorkouts = async (
  userId: string,
  query?: GetWorkoutsQuery
) => {
  return workoutRepo.findWorkoutsByUser(
    userId,
    query
      ? {
          ...(query.status && { status: query.status }),
          ...(query.limit && { limit: query.limit }),
          ...(query.offset !== undefined && { offset: query.offset }),
        }
      : undefined
  );
};

export const updateWorkout = async (
  id: string,
  userId: string,
  data: UpdateWorkoutDto
) => {
  await getWorkoutById(id, userId);

  const updateData: Prisma.WorkoutUpdateInput = {
    ...(data.workoutDate && { workoutDate: new Date(data.workoutDate) }),
    ...(data.status && { status: data.status }),
    ...(data.workoutName !== undefined && { workoutName: data.workoutName }),
    ...(data.gymName !== undefined && { gymName: data.gymName }),
    ...(data.location !== undefined && { location: data.location }),
    ...(data.workoutNotes !== undefined && { workoutNotes: data.workoutNotes }),
  };

  const updatedWorkout = await workoutRepo.updateWorkout(id, updateData);

  if (data.status === "COMPLETED") {
    await updateStatsAfterWorkoutCompletion(id, userId);
    await workoutRepo.clearActiveWorkout(userId);
  }

  return updatedWorkout;
};

export const deleteWorkout = async (id: string, userId: string) => {
  const workout = await getWorkoutById(id, userId);
  const affectedExerciseIds = [
    ...new Set(workout.items.map((item) => item.exerciseId)),
  ];

  const deletedWorkout = await workoutRepo.deleteWorkout(id);

  if (workout.status === "COMPLETED") {
    for (const exerciseId of affectedExerciseIds) {
      await rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId);
    }
  }

  return deletedWorkout;
};

export const addExerciseToWorkout = async (
  workoutId: string,
  userId: string,
  data: AddExerciseToWorkoutDto
) => {
  const workout = await getWorkoutById(workoutId, userId);

  let orderInWorkout = data.orderInWorkout;
  if (!orderInWorkout) {
    const maxOrder = await workoutRepo.getMaxOrderInWorkout(workoutId);
    orderInWorkout = maxOrder + 1;
  }

  const item = await workoutRepo.addExerciseToWorkout(
    workoutId,
    data.exerciseId,
    orderInWorkout,
    data.notes
  );

  await workoutRepo.addSetToWorkoutItem(item.id, 0, 1, 1);

  if (workout.status === "COMPLETED") {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, data.exerciseId);
  }

  return workoutRepo.findWorkoutItemById(item.id);
};

export const updateWorkoutItem = async (
  itemId: string,
  userId: string,
  data: UpdateWorkoutItemDto
) => {
  const item = await workoutRepo.findWorkoutItemById(itemId);
  if (!item) {
    throw new Error("Pozycja treningowa nie znaleziona");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  const updateData: any = {};
  if (data.orderInWorkout !== undefined)
    updateData.orderInWorkout = data.orderInWorkout;
  if (data.notes !== undefined) updateData.notes = data.notes ?? null;
  return workoutRepo.updateWorkoutItem(itemId, updateData);
};

export const deleteWorkoutItem = async (itemId: string, userId: string) => {
  const item = await workoutRepo.findWorkoutItemById(itemId);
  if (!item) {
    throw new Error("Pozycja treningowa nie znaleziona");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  const deletedItem = await workoutRepo.deleteWorkoutItem(itemId);
  if (workout.status === "COMPLETED") {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, item.exerciseId);
  }

  return deletedItem;
};

export const addSetToWorkoutItem = async (
  itemId: string,
  userId: string,
  data: CreateWorkoutSetDto
) => {
  const item = await workoutRepo.findWorkoutItemById(itemId);
  if (!item) {
    throw new Error("Pozycja treningowa nie znaleziona");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  let setNumber = data.setNumber;
  if (!setNumber) {
    const maxSetNumber = await workoutRepo.getMaxSetNumber(itemId);
    setNumber = maxSetNumber + 1;
  }

  const createdSet = await workoutRepo.addSetToWorkoutItem(
    itemId,
    data.weight,
    data.repetitions,
    setNumber
  );

  if (workout.status === "COMPLETED") {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, item.exerciseId);
  }

  return createdSet;
};

export const updateWorkoutSet = async (
  setId: string,
  userId: string,
  data: UpdateWorkoutSetDto
) => {
  const set = await workoutRepo.updateWorkoutSet(setId, {});
  const item = await workoutRepo.findWorkoutItemById(set.itemId);
  if (!item) {
    throw new Error("Nie znaleziono pozycji treningowej");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  const updateData: any = {};
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.repetitions !== undefined) updateData.repetitions = data.repetitions;
  const updatedSet = await workoutRepo.updateWorkoutSet(setId, updateData);
  if (workout.status === "COMPLETED") {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, item.exerciseId);
  }

  return updatedSet;
};

export const deleteWorkoutSet = async (setId: string, userId: string) => {
  const sets = await workoutRepo.findWorkoutSetById(setId);
  if (!sets) {
    throw new Error("Nie znaleziono serii");
  }
  const item = await workoutRepo.findWorkoutItemById(sets.itemId);
  if (!item) {
    throw new Error("Nie znaleziono pozycji treningowej");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  const deletedSet = await workoutRepo.deleteWorkoutSet(setId);
  if (workout.status === "COMPLETED") {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, item.exerciseId);
  }

  return deletedSet;
};

export const getExerciseStatsForUser = async (
  userId: string,
  exerciseId: string
) => {
  return workoutRepo.getExerciseStats(userId, exerciseId);
};

export const getAllUserStats = async (userId: string) => {
  return workoutRepo.getAllUserStats(userId);
};

export const getStatsOverview = async (userId: string) => {
  return workoutRepo.getStatsOverview(userId);
};

export const getExerciseProgression = async (
  userId: string,
  exerciseId: string,
  query: GetStatsProgressionQuery,
) => {
  const metric: StatsProgressMetric = query.metric ?? "maxSetWeight";
  const filters = {
    ...(query.from ? { from: new Date(query.from) } : {}),
    ...(query.to ? { to: new Date(query.to) } : {}),
  };
  const points = await workoutRepo.getExerciseProgression(userId, exerciseId, {
    ...filters,
  });

  return {
    exerciseId,
    metric,
    points: points.map((point) => ({
      workoutId: point.workoutId,
      workoutDate: point.workoutDate,
      maxSetWeight: point.maxSetWeight,
      repetitionsAtMaxSet: point.repetitionsAtMaxSet,
      volume: point.volume,
      value: metric === "volume" ? point.volume : point.maxSetWeight,
    })),
  };
};

const updateStatsAfterWorkoutCompletion = async (
  workoutId: string,
  userId: string
) => {
  const workout = await workoutRepo.findWorkoutById(workoutId);
  if (!workout) return;

  const workoutDate = workout.workoutDate;

  for (const item of workout.items) {
    if (item.sets.length === 0) continue;

    const heaviestSet = item.sets.reduce((max, set) =>
      Number(set.weight) > Number(max.weight) ? set : max
    );

    const lastWeight = Number(heaviestSet.weight);
    const lastReps = heaviestSet.repetitions;

    const currentStats = await workoutRepo.getExerciseStats(
      userId,
      item.exerciseId
    );

    if (!currentStats) {
      await workoutRepo.upsertExerciseStats(userId, item.exerciseId, {
        maxWeight: lastWeight,
        maxWeightReps: lastReps,
        maxWeightDate: workoutDate,
        lastWeight,
        lastReps,
        lastWorkoutDate: workoutDate,
        totalWorkouts: 1,
      });
    } else {
      const isNewRecord = lastWeight > Number(currentStats.maxWeight);

      await workoutRepo.upsertExerciseStats(userId, item.exerciseId, {
        maxWeight: isNewRecord ? lastWeight : Number(currentStats.maxWeight),
        maxWeightReps: isNewRecord ? lastReps : currentStats.maxWeightReps,
        maxWeightDate: isNewRecord ? workoutDate : currentStats.maxWeightDate,
        lastWeight,
        lastReps,
        lastWorkoutDate: workoutDate,
        totalWorkouts: currentStats.totalWorkouts + 1,
      });
    }
  }
};

const rebuildExerciseStatsFromCompletedWorkouts = async (
  userId: string,
  exerciseId: string
) => {
  const progression = await workoutRepo.getExerciseProgression(userId, exerciseId);

  if (progression.length === 0) {
    await workoutRepo.deleteExerciseStats(userId, exerciseId);
    return;
  }

  const lastPoint = progression[progression.length - 1]!;
  const maxPoint = progression.reduce((currentMax, point) =>
    point.maxSetWeight > currentMax.maxSetWeight ? point : currentMax
  );

  await workoutRepo.upsertExerciseStats(userId, exerciseId, {
    maxWeight: maxPoint.maxSetWeight,
    maxWeightReps: maxPoint.repetitionsAtMaxSet,
    maxWeightDate: maxPoint.workoutDate,
    lastWeight: lastPoint.maxSetWeight,
    lastReps: lastPoint.repetitionsAtMaxSet,
    lastWorkoutDate: lastPoint.workoutDate,
    totalWorkouts: progression.length,
  });
};

export const getActiveWorkoutId = async (userId: string) => {
  const result = await workoutRepo.getActiveWorkout(userId);
  return result?.activeWorkoutId || null;
};

export const clearActiveWorkout = async (userId: string) => {
  await workoutRepo.clearActiveWorkout(userId);
};
