import type {
  CreateWorkoutDto,
  UpdateWorkoutDto,
  AddExerciseToWorkoutDto,
  UpdateWorkoutItemDto,
  CreateWorkoutSetDto,
  UpdateWorkoutSetDto,
  GetWorkoutsQuery,
} from "./workout.schema.js";
import * as workoutRepo from "./workout.repository.js";
import { Prisma } from "@prisma/client";

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
    workoutName: data.workoutName,
    gymName: data.gymName,
    location: data.location,
    workoutNotes: data.workoutNotes,
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
  query: GetWorkoutsQuery
) => {
  return workoutRepo.findWorkoutsByUser(userId, query);
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
  await getWorkoutById(id, userId);
  return workoutRepo.deleteWorkout(id);
};

export const addExerciseToWorkout = async (
  workoutId: string,
  userId: string,
  data: AddExerciseToWorkoutDto
) => {
  await getWorkoutById(workoutId, userId);

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

  return workoutRepo.updateWorkoutItem(itemId, data);
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

  return workoutRepo.deleteWorkoutItem(itemId);
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

  return workoutRepo.addSetToWorkoutItem(
    itemId,
    data.weight,
    data.repetitions,
    setNumber
  );
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

  return workoutRepo.updateWorkoutSet(setId, data);
};

export const deleteWorkoutSet = async (setId: string, userId: string) => {
  const sets = await workoutRepo.updateWorkoutSet(setId, {});
  const item = await workoutRepo.findWorkoutItemById(sets.itemId);
  if (!item) {
    throw new Error("Nie znaleziono pozycji treningowej");
  }

  const workout = await workoutRepo.findWorkoutById(item.workoutId);
  if (workout?.userId !== userId) {
    throw new Error("Brak uprawnień");
  }

  return workoutRepo.deleteWorkoutSet(setId);
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

export const getActiveWorkoutId = async (userId: string) => {
  const result = await workoutRepo.getActiveWorkout(userId);
  return result?.activeWorkoutId || null;
};

export const clearActiveWorkout = async (userId: string) => {
  await workoutRepo.clearActiveWorkout(userId);
};
