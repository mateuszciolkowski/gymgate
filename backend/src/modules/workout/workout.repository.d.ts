import type { Prisma } from "@prisma/client";
export declare const createWorkout: (data: Prisma.WorkoutCreateInput) => Prisma.Prisma__WorkoutClient<{
    items: ({
        exercise: {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string | null;
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
    userId: string;
    createdAt: Date;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const findWorkoutById: (id: string) => Prisma.Prisma__WorkoutClient<({
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
            creatorUserId: string | null;
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
    userId: string;
    createdAt: Date;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}) | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const findWorkoutsByUser: (userId: string, filters?: {
    status?: "DRAFT" | "COMPLETED";
    limit?: number;
    offset?: number;
}) => Prisma.PrismaPromise<({
    items: ({
        exercise: {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string | null;
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
    userId: string;
    createdAt: Date;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
})[]>;
export declare const updateWorkout: (id: string, data: Prisma.WorkoutUpdateInput) => Prisma.Prisma__WorkoutClient<{
    items: ({
        exercise: {
            id: string;
            updatedAt: Date;
            name: string;
            muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
            description: string | null;
            creatorUserId: string | null;
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
    userId: string;
    createdAt: Date;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const deleteWorkout: (id: string) => Prisma.Prisma__WorkoutClient<{
    id: string;
    updatedAt: Date;
    userId: string;
    createdAt: Date;
    workoutDate: Date;
    workoutName: string | null;
    gymName: string | null;
    location: string | null;
    workoutNotes: string | null;
    status: import("@prisma/client").$Enums.WorkoutStatus;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const addExerciseToWorkout: (workoutId: string, exerciseId: string, orderInWorkout: number, notes?: string) => Prisma.Prisma__WorkoutItemClient<{
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
        creatorUserId: string | null;
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
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const findWorkoutItemById: (id: string) => Prisma.Prisma__WorkoutItemClient<({
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
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
}) | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const updateWorkoutItem: (id: string, data: Prisma.WorkoutItemUpdateInput) => Prisma.Prisma__WorkoutItemClient<{
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
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
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const deleteWorkoutItem: (id: string) => Prisma.Prisma__WorkoutItemClient<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    exerciseId: string;
    orderInWorkout: number;
    notes: string | null;
    workoutId: string;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const getMaxOrderInWorkout: (workoutId: string) => Promise<number>;
export declare const addSetToWorkoutItem: (itemId: string, weight: number, repetitions: number, setNumber: number) => Prisma.Prisma__WorkoutSetClient<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const findWorkoutSetById: (id: string) => Prisma.Prisma__WorkoutSetClient<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
} | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const updateWorkoutSet: (id: string, data: Prisma.WorkoutSetUpdateInput) => Prisma.Prisma__WorkoutSetClient<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const deleteWorkoutSet: (id: string) => Prisma.Prisma__WorkoutSetClient<{
    id: string;
    updatedAt: Date;
    createdAt: Date;
    itemId: string;
    weight: Prisma.Decimal;
    repetitions: number;
    setNumber: number;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const getMaxSetNumber: (itemId: string) => Promise<number>;
export declare const getExerciseStats: (userId: string, exerciseId: string) => Prisma.Prisma__ExerciseUserStatsClient<{
    id: string;
    updatedAt: Date;
    userId: string;
    createdAt: Date;
    exerciseId: string;
    maxWeight: Prisma.Decimal;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: Prisma.Decimal;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts: number;
} | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const getAllUserStats: (userId: string) => Prisma.PrismaPromise<({
    exercise: {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    };
} & {
    id: string;
    updatedAt: Date;
    userId: string;
    createdAt: Date;
    exerciseId: string;
    maxWeight: Prisma.Decimal;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: Prisma.Decimal;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts: number;
})[]>;
export declare const upsertExerciseStats: (userId: string, exerciseId: string, data: {
    maxWeight: number;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: number;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts?: number;
}) => Prisma.Prisma__ExerciseUserStatsClient<{
    id: string;
    updatedAt: Date;
    userId: string;
    createdAt: Date;
    exerciseId: string;
    maxWeight: Prisma.Decimal;
    maxWeightReps: number;
    maxWeightDate: Date;
    lastWeight: Prisma.Decimal;
    lastReps: number;
    lastWorkoutDate: Date;
    totalWorkouts: number;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const setActiveWorkout: (userId: string, workoutId: string) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const getActiveWorkout: (userId: string) => Prisma.Prisma__UserClient<{
    activeWorkoutId: string | null;
} | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const clearActiveWorkout: (userId: string) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
//# sourceMappingURL=workout.repository.d.ts.map