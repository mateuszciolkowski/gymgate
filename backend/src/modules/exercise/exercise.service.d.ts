import type { CreateExerciseDto, UpdateExerciseDto, FilterExercisesDto } from "./exercise.schema.js";
export declare class ExerciseService {
    private repository;
    constructor();
    getAllExercises(filters?: FilterExercisesDto & {
        userId?: string;
    }): Promise<({
        photos: {
            id: string;
            photoStage: import("@prisma/client").$Enums.PhotoStage;
            photoUrl: string;
            createdAt: Date;
            exerciseId: string;
        }[];
        creator: {
            id: string;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            updatedAt: Date;
            activeWorkoutId: string | null;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    })[]>;
    getExerciseById(id: string): Promise<{
        photos: {
            id: string;
            photoStage: import("@prisma/client").$Enums.PhotoStage;
            photoUrl: string;
            createdAt: Date;
            exerciseId: string;
        }[];
        creator: {
            id: string;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            updatedAt: Date;
            activeWorkoutId: string | null;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    }>;
    createExercise(data: CreateExerciseDto): Promise<{
        photos: {
            id: string;
            photoStage: import("@prisma/client").$Enums.PhotoStage;
            photoUrl: string;
            createdAt: Date;
            exerciseId: string;
        }[];
        creator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    }>;
    updateExercise(id: string, data: UpdateExerciseDto, userId: string): Promise<{
        photos: {
            id: string;
            photoStage: import("@prisma/client").$Enums.PhotoStage;
            photoUrl: string;
            createdAt: Date;
            exerciseId: string;
        }[];
        creator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    }>;
    deleteExercise(id: string, userId: string): Promise<{
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    }>;
    getExercisesByMuscleGroups(muscleGroups: string[]): Promise<({
        photos: {
            id: string;
            photoStage: import("@prisma/client").$Enums.PhotoStage;
            photoUrl: string;
            createdAt: Date;
            exerciseId: string;
        }[];
        creator: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string | null;
        createdAt: Date;
    })[]>;
}
//# sourceMappingURL=exercise.service.d.ts.map