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
import { PlanService } from "../plan/plan.service.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors.js";

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

  if (data.workoutPlanId) {
    // Throws NotFoundError gdy plan nie istnieje lub nie jest widoczny dla usera.
    // Zapobiega podpinaniu treningu pod prywatny plan innego użytkownika.
    await new PlanService().getPlanById(data.workoutPlanId, userId);
  }

  const workoutData: Prisma.WorkoutCreateInput = {
    workoutDate: data.workoutDate ? new Date(data.workoutDate) : new Date(),
    workoutName: data.workoutName ?? null,
    gymName: data.gymName ?? null,
    location: data.location ?? null,
    workoutNotes: data.workoutNotes ?? null,
    user: { connect: { id: userId } },
    ...(data.workoutPlanId && {
      plan: { connect: { id: data.workoutPlanId } },
    }),
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
  const existingWorkout = await getWorkoutById(id, userId);
  const previousStatus = existingWorkout.status;
  const nextStatus = data.status ?? previousStatus;
  const affectedExerciseIds = [
    ...new Set(existingWorkout.items.map((item) => item.exerciseId)),
  ];

  const updateData: Prisma.WorkoutUpdateInput = {
    ...(data.workoutDate && { workoutDate: new Date(data.workoutDate) }),
    ...(data.status && { status: data.status }),
    ...(data.workoutName !== undefined && { workoutName: data.workoutName }),
    ...(data.gymName !== undefined && { gymName: data.gymName }),
    ...(data.location !== undefined && { location: data.location }),
    ...(data.workoutNotes !== undefined && { workoutNotes: data.workoutNotes }),
    ...(data.durationSeconds !== undefined && { durationSeconds: data.durationSeconds }),
  };

  const updatedWorkout = await workoutRepo.updateWorkout(id, updateData);

  if (
    previousStatus !== nextStatus &&
    (previousStatus === "COMPLETED" || nextStatus === "COMPLETED")
  ) {
    for (const exerciseId of affectedExerciseIds) {
      await rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId);
    }
  }

  if (previousStatus !== "COMPLETED" && nextStatus === "COMPLETED") {
    for (const item of existingWorkout.items) {
      await syncPendingNoteForExercise(userId, item.exerciseId, item.notes ?? null);
    }
  }

  if (nextStatus === "COMPLETED") {
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

  for (const exerciseId of affectedExerciseIds) {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, exerciseId);
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

  const item = await workoutRepo.addExerciseToWorkoutWithPendingNote(
    workoutId,
    userId,
    data.exerciseId,
    orderInWorkout,
    data.notes
  );

  let defaultWeight = 0;
  let defaultReps = 1;
  try {
    const stats = await workoutRepo.getExerciseStats(userId, data.exerciseId);
    if (stats) {
      defaultWeight = Number(stats.lastWeight);
      defaultReps = stats.lastReps;
    }
  } catch {
    // fall through to defaults
  }
  await workoutRepo.addSetToWorkoutItem(item.id, defaultWeight, defaultReps, 1);

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
  const updatedItem = await workoutRepo.updateWorkoutItem(itemId, updateData);

  if (data.notes !== undefined) {
    await syncPendingNoteForExercise(userId, item.exerciseId, data.notes ?? null);
  }

  if (workout.status === "COMPLETED" && data.notes !== undefined) {
    await rebuildExerciseStatsFromCompletedWorkouts(userId, item.exerciseId);
  }

  return updatedItem;
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

const rebuildExerciseStatsFromCompletedWorkouts = async (
  userId: string,
  exerciseId: string
) => {
  const progression = await workoutRepo.getExerciseProgression(userId, exerciseId);

  if (progression.length === 0) {
    await workoutRepo.deleteExerciseStats(userId, exerciseId);
    return;
  }

  const lastNote = await workoutRepo.getLastWorkoutNote(userId, exerciseId);

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
    lastNote,
  });
};

const normalizeExerciseNote = (note: string | null | undefined): string | null => {
  if (note === null || note === undefined) {
    return null;
  }

  const normalized = note.trim();
  return normalized.length > 0 ? normalized : null;
};

const syncPendingNoteForExercise = async (
  userId: string,
  exerciseId: string,
  note: string | null | undefined,
) => {
  const normalized = normalizeExerciseNote(note);
  if (!normalized) {
    await workoutRepo.clearPendingExerciseNote(userId, exerciseId);
    return;
  }

  await workoutRepo.setPendingExerciseNote(userId, exerciseId, normalized);
};

export const getActiveWorkoutId = async (userId: string) => {
  const result = await workoutRepo.getActiveWorkout(userId);
  return result?.activeWorkoutId || null;
};

export const clearActiveWorkout = async (userId: string) => {
  await workoutRepo.clearActiveWorkout(userId);
};

export const getNextFromPlan = async (workoutId: string, userId: string) => {
  const workout = await workoutRepo.findWorkoutWithPlan(workoutId);
  if (!workout) {
    throw new NotFoundError("Trening nie znaleziony");
  }
  if (workout.userId !== userId) {
    throw new ForbiddenError("Brak uprawnień do tego treningu");
  }

  if (!workout.plan) {
    return {
      planAttached: false,
      finished: false,
      remaining: 0,
      next: null,
    };
  }

  const addedIds = new Set(workout.items.map((i) => i.exerciseId));
  const skippedIds = new Set(workout.skippedPlanExerciseIds);

  const pending = workout.plan.items.filter(
    (item) => !addedIds.has(item.exerciseId) && !skippedIds.has(item.exerciseId),
  );
  const next = pending[0];

  return {
    planAttached: true,
    finished: pending.length === 0,
    remaining: pending.length,
    next: next
      ? {
          exerciseId: next.exerciseId,
          exerciseName: next.exercise.name,
          orderInPlan: next.orderInPlan,
        }
      : null,
  };
};

export const skipPlanExercise = async (
  workoutId: string,
  userId: string,
  exerciseId: string,
) => {
  const workout = await workoutRepo.findWorkoutWithPlan(workoutId);
  if (!workout) {
    throw new NotFoundError("Trening nie znaleziony");
  }
  if (workout.userId !== userId) {
    throw new ForbiddenError("Brak uprawnień do tego treningu");
  }
  if (!workout.plan) {
    throw new BadRequestError("Trening nie jest powiązany z planem");
  }

  const planHasExercise = workout.plan.items.some(
    (item) => item.exerciseId === exerciseId,
  );
  if (!planHasExercise) {
    throw new BadRequestError("Ćwiczenie nie należy do planu tego treningu");
  }

  if (workout.skippedPlanExerciseIds.includes(exerciseId)) {
    return {
      workoutId: workout.id,
      skippedPlanExerciseIds: workout.skippedPlanExerciseIds,
    };
  }

  const next = [...workout.skippedPlanExerciseIds, exerciseId];
  const updated = await workoutRepo.setSkippedPlanExerciseIds(workoutId, next);
  return {
    workoutId: updated.id,
    skippedPlanExerciseIds: updated.skippedPlanExerciseIds,
  };
};
