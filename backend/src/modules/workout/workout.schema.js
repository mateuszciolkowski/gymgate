import { z } from "zod";
const createWorkoutBody = z.object({
    workoutDate: z.string().datetime().optional(),
    workoutName: z.string().optional(),
    gymName: z.string().optional(),
    location: z.string().optional(),
    workoutNotes: z.string().optional(),
});
export const createWorkoutSchema = z.object({
    body: createWorkoutBody,
});
const updateWorkoutBody = z.object({
    workoutDate: z.string().datetime().optional(),
    status: z.enum(["DRAFT", "COMPLETED"]).optional(),
    workoutName: z.string().optional(),
    gymName: z.string().optional(),
    location: z.string().optional(),
    workoutNotes: z.string().optional(),
});
export const updateWorkoutSchema = z.object({
    body: updateWorkoutBody,
});
const addExerciseToWorkoutBody = z.object({
    exerciseId: z.string().uuid(),
    orderInWorkout: z.number().int().positive().optional(),
    notes: z.string().optional(),
});
export const addExerciseToWorkoutSchema = z.object({
    body: addExerciseToWorkoutBody,
    params: z.object({
        workoutId: z.string().uuid(),
    }),
});
const updateWorkoutItemBody = z.object({
    orderInWorkout: z.number().int().positive().optional(),
    notes: z.string().optional(),
});
export const updateWorkoutItemSchema = z.object({
    body: updateWorkoutItemBody,
    params: z.object({
        itemId: z.string().uuid(),
    }),
});
// WorkoutSet schemas
const createWorkoutSetBody = z.object({
    weight: z.number().positive(),
    repetitions: z.number().int().positive(),
    setNumber: z.number().int().positive().optional(),
});
export const createWorkoutSetSchema = z.object({
    body: createWorkoutSetBody,
    params: z.object({
        itemId: z.string().uuid(),
    }),
});
const updateWorkoutSetBody = z.object({
    weight: z.number().positive().optional(),
    repetitions: z.number().int().positive().optional(),
});
export const updateWorkoutSetSchema = z.object({
    body: updateWorkoutSetBody,
    params: z.object({
        setId: z.string().uuid(),
    }),
});
// Query schemas
export const getWorkoutsQuerySchema = z.object({
    query: z.object({
        status: z.enum(["DRAFT", "COMPLETED"]).optional(),
        limit: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
            .optional(),
        offset: z
            .string()
            .transform(Number)
            .pipe(z.number().int().nonnegative())
            .optional(),
    }),
});
//# sourceMappingURL=workout.schema.js.map