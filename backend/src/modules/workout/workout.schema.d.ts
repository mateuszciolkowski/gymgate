import { z } from "zod";
declare const createWorkoutBody: z.ZodObject<{
    workoutDate: z.ZodOptional<z.ZodString>;
    workoutName: z.ZodOptional<z.ZodString>;
    gymName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    workoutNotes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createWorkoutSchema: z.ZodObject<{
    body: z.ZodObject<{
        workoutDate: z.ZodOptional<z.ZodString>;
        workoutName: z.ZodOptional<z.ZodString>;
        gymName: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        workoutNotes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const updateWorkoutBody: z.ZodObject<{
    workoutDate: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        COMPLETED: "COMPLETED";
    }>>;
    workoutName: z.ZodOptional<z.ZodString>;
    gymName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    workoutNotes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateWorkoutSchema: z.ZodObject<{
    body: z.ZodObject<{
        workoutDate: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            DRAFT: "DRAFT";
            COMPLETED: "COMPLETED";
        }>>;
        workoutName: z.ZodOptional<z.ZodString>;
        gymName: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        workoutNotes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const addExerciseToWorkoutBody: z.ZodObject<{
    exerciseId: z.ZodString;
    orderInWorkout: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const addExerciseToWorkoutSchema: z.ZodObject<{
    body: z.ZodObject<{
        exerciseId: z.ZodString;
        orderInWorkout: z.ZodOptional<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    params: z.ZodObject<{
        workoutId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const updateWorkoutItemBody: z.ZodObject<{
    orderInWorkout: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateWorkoutItemSchema: z.ZodObject<{
    body: z.ZodObject<{
        orderInWorkout: z.ZodOptional<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    params: z.ZodObject<{
        itemId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const createWorkoutSetBody: z.ZodObject<{
    weight: z.ZodNumber;
    repetitions: z.ZodNumber;
    setNumber: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createWorkoutSetSchema: z.ZodObject<{
    body: z.ZodObject<{
        weight: z.ZodNumber;
        repetitions: z.ZodNumber;
        setNumber: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    params: z.ZodObject<{
        itemId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const updateWorkoutSetBody: z.ZodObject<{
    weight: z.ZodOptional<z.ZodNumber>;
    repetitions: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateWorkoutSetSchema: z.ZodObject<{
    body: z.ZodObject<{
        weight: z.ZodOptional<z.ZodNumber>;
        repetitions: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    params: z.ZodObject<{
        setId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getWorkoutsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<{
            DRAFT: "DRAFT";
            COMPLETED: "COMPLETED";
        }>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodNumber>>;
        offset: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateWorkoutDto = z.infer<typeof createWorkoutBody>;
export type UpdateWorkoutDto = z.infer<typeof updateWorkoutBody>;
export type AddExerciseToWorkoutDto = z.infer<typeof addExerciseToWorkoutBody>;
export type UpdateWorkoutItemDto = z.infer<typeof updateWorkoutItemBody>;
export type CreateWorkoutSetDto = z.infer<typeof createWorkoutSetBody>;
export type UpdateWorkoutSetDto = z.infer<typeof updateWorkoutSetBody>;
export type GetWorkoutsQuery = z.infer<typeof getWorkoutsQuerySchema>["query"];
export {};
//# sourceMappingURL=workout.schema.d.ts.map