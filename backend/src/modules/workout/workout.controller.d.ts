import type { Response } from "express";
import type { AuthRequest } from "../../common/middleware/auth.js";
export declare const createWorkout: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getWorkoutById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getUserWorkouts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateWorkout: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteWorkout: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addExerciseToWorkout: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateWorkoutItem: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteWorkoutItem: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addSetToWorkoutItem: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateWorkoutSet: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteWorkoutSet: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getExerciseStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllUserStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getActiveWorkout: (req: AuthRequest, res: Response) => Promise<void>;
export declare const clearActiveWorkout: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=workout.controller.d.ts.map