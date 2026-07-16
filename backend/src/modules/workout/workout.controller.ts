import type { Response } from "express";
import type { AuthRequest } from "../../common/middleware/auth.js";
import * as workoutService from "./workout.service.js";
import { sendError } from "../../common/errors.js";

export const createWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await workoutService.createWorkout(req.userId!, req.body);
    res.status(201).json({ success: true, data: workout });
  } catch (error) {
    sendError(res, error);
  }
};

export const getWorkoutById = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await workoutService.getWorkoutById(
      req.params.id!,
      req.userId!,
    );
    res.json({ success: true, data: workout });
  } catch (error) {
    sendError(res, error);
  }
};

export const getUserWorkouts = async (req: AuthRequest, res: Response) => {
  try {
    const workouts = await workoutService.getUserWorkouts(
      req.userId!,
      req.query as any,
    );
    res.json({ success: true, data: workouts, count: workouts.length });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workout = await workoutService.updateWorkout(
      req.params.id!,
      req.userId!,
      req.body,
    );
    res.json({ success: true, data: workout });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteWorkout = async (req: AuthRequest, res: Response) => {
  try {
    await workoutService.deleteWorkout(req.params.id!, req.userId!);
    res.json({ success: true, message: "Trening usunięty" });
  } catch (error) {
    sendError(res, error);
  }
};

export const addExerciseToWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const workoutItem = await workoutService.addExerciseToWorkout(
      req.params.workoutId!,
      req.userId!,
      req.body,
    );
    res.status(201).json({ success: true, data: workoutItem });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateWorkoutItem = async (req: AuthRequest, res: Response) => {
  try {
    const updatedItem = await workoutService.updateWorkoutItem(
      req.params.itemId!,
      req.userId!,
      req.body,
    );
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteWorkoutItem = async (req: AuthRequest, res: Response) => {
  try {
    await workoutService.deleteWorkoutItem(req.params.itemId!, req.userId!);
    res.json({ success: true, message: "Ćwiczenie usunięte z treningu" });
  } catch (error) {
    sendError(res, error);
  }
};

export const addSetToWorkoutItem = async (req: AuthRequest, res: Response) => {
  try {
    const newSet = await workoutService.addSetToWorkoutItem(
      req.params.itemId!,
      req.userId!,
      req.body,
    );
    res.status(201).json({ success: true, data: newSet });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateWorkoutSet = async (req: AuthRequest, res: Response) => {
  try {
    const set = await workoutService.updateWorkoutSet(
      req.params.setId!,
      req.userId!,
      req.body,
    );
    res.json({ success: true, data: set });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteWorkoutSet = async (req: AuthRequest, res: Response) => {
  try {
    await workoutService.deleteWorkoutSet(req.params.setId!, req.userId!);
    res.json({ success: true, message: "Seria usunięta" });
  } catch (error) {
    sendError(res, error);
  }
};

export const getExerciseStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await workoutService.getExerciseStatsForUser(
      req.userId!,
      req.params.exerciseId!,
    );
    if (!stats) {
      return res.json({
        success: true,
        data: null,
        message: "To twoje pierwsze wykonanie tego ćwiczenia",
      });
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    sendError(res, error);
  }
};

export const getAllUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await workoutService.getAllUserStats(req.userId!);
    res.json({ success: true, data: stats, count: stats.length });
  } catch (error) {
    sendError(res, error);
  }
};

export const getStatsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const overview = await workoutService.getStatsOverview(req.userId!);
    res.json({ success: true, data: overview });
  } catch (error) {
    sendError(res, error);
  }
};

export const getExerciseProgression = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const progression = await workoutService.getExerciseProgression(
      req.userId!,
      req.params.exerciseId!,
      req.query as {
        metric?: "maxSetWeight" | "volume";
        from?: string;
        to?: string;
      },
    );
    res.json({ success: true, data: progression });
  } catch (error) {
    sendError(res, error);
  }
};

export const getActiveWorkout = async (req: AuthRequest, res: Response) => {
  try {
    const activeWorkoutId = await workoutService.getActiveWorkoutId(
      req.userId!,
    );
    res.json({ success: true, data: { activeWorkoutId } });
  } catch (error) {
    sendError(res, error);
  }
};

export const clearActiveWorkout = async (req: AuthRequest, res: Response) => {
  try {
    await workoutService.clearActiveWorkout(req.userId!);
    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
};

export const getNextFromPlan = async (req: AuthRequest, res: Response) => {
  try {
    const data = await workoutService.getNextFromPlan(
      req.params.id!,
      req.userId!,
    );
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};

export const skipPlanExercise = async (req: AuthRequest, res: Response) => {
  try {
    const data = await workoutService.skipPlanExercise(
      req.params.id!,
      req.userId!,
      req.body.exerciseId,
    );
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};
