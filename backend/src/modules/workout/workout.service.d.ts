import type { CreateWorkoutDto, UpdateWorkoutDto, AddExerciseToWorkoutDto, UpdateWorkoutItemDto, CreateWorkoutSetDto, UpdateWorkoutSetDto, GetWorkoutsQuery } from "./workout.schema.js";
import { Prisma } from "@prisma/client";
export declare const createWorkout: (userId: string, data: CreateWorkoutDto) => Promise<{
    items: ({
        exercise: {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string;
            createdAt: Date;
        };
        sets: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            itemId: string;
            weight: Prisma.Decimal;
            repetitions: number;
            setNumber: number;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        exerciseId: string;
        orderInWorkout: number;
        notes: string | null;
        workoutId: string;
    })[];
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}>;
export declare const getWorkoutById: (id: string, userId: string) => Promise<{
    items: ({
        exercise: {
            photos: {
                id: string;
                photoStage: import("@prisma/client").$Enums.PhotoStage;
                photoUrl: string;
                createdAt: Date;
                exerciseId: string;
            }[];
        } & {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string;
            createdAt: Date;
        };
        sets: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            itemId: string;
            weight: Prisma.Decimal;
            repetitions: number;
            setNumber: number;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        exerciseId: string;
        orderInWorkout: number;
        notes: string | null;
        workoutId: string;
    })[];
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}>;
export declare const getUserWorkouts: (userId: string, query: GetWorkoutsQuery) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}[]>;
export declare const updateWorkout: (id: string, userId: string, data: UpdateWorkoutDto) => Promise<{
    items: ({
        exercise: {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string;
            createdAt: Date;
        };
        sets: {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            itemId: string;
            weight: Prisma.Decimal;
            repetitions: number;
            setNumber: number;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        exerciseId: string;
        orderInWorkout: number;
        notes: string | null;
        workoutId: string;
    })[];
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}>;
export declare const deleteWorkout: (id: string, userId: string) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}>;
export declare const addExerciseToWorkout: (workoutId: string, userId: string, data: AddExerciseToWorkoutDto) => Promise<({
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    };
    sets: {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        itemId: string;
        weight: Prisma.Decimal;
        repetitions: number;
        setNumber: number;
    }[];
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    exerciseId: string;
    orderInWorkout: number;
    notes: string | null;
    workoutId: string;
}) | null>;
export declare const updateWorkoutItem: (itemId: string, userId: string, data: UpdateWorkoutItemDto) => Promise<{
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    };
    sets: {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        itemId: string;
        weight: Prisma.Decimal;
        repetitions: number;
        setNumber: number;
    }[];
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    exerciseId: string;
    orderInWorkout: number;
    notes: string | null;
    workoutId: string;
}>;
export declare const deleteWorkoutItem: (itemId: string, userId: string) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    exerciseId: string;
    orderInWorkout: number;
    notes: string | null;
    workoutId: string;
}>;
export declare const addSetToWorkoutItem: (itemId: string, userId: string, data: CreateWorkoutSetDto) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}>;
export declare const updateWorkoutSet: (setId: string, userId: string, data: UpdateWorkoutSetDto) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}>;
export declare const deleteWorkoutSet: (setId: string, userId: string) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}>;
export declare const getExerciseStatsForUser: (userId: string, exerciseId: string) => Promise<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    exerciseId: string;
    maxWeight: Prisma.Decimal;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: Prisma.Decimal;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts: number;
} | null>;
export declare const getAllUserStats: (userId: string) => Promise<({
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    };
} & {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    userId: string;
    exerciseId: string;
    maxWeight: Prisma.Decimal;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: Prisma.Decimal;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts: number;
})[]>;
export declare const getActiveWorkoutId: (userId: string) => Promise<string | null>;
export declare const clearActiveWorkout: (userId: string) => Promise<void>;
//# sourceMappingURL=workout.service.d.ts.map