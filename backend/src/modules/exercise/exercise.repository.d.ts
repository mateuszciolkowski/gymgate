import type { CreateExerciseDto, UpdateExerciseDto, FilterExercisesDto } from './exercise.schema.js';
import type { MuscleGroup } from '@prisma/client';
export declare class ExerciseRepository {
    findAll(filters?: FilterExercisesDto): Promise<({
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
        };
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    })[]>;
    findById(id: string): Promise<({
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
        };
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    }) | null>;
    create(data: CreateExerciseDto & {
        userId?: string;
    }): Promise<{
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
        };
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    }>;
    update(id: string, data: UpdateExerciseDto): Promise<{
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
        };
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    }>;
    delete(id: string): Promise<{
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    }>;
    findByMuscleGroups(muscleGroups: MuscleGroup[]): Promise<({
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
        };
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        muscleGroups: import("@prisma/client").$Enums.MuscleGroup[];
        description: string | null;
        creatorUserId: string;
        createdAt: Date;
    })[]>;
}
//# sourceMappingURL=exercise.repository.d.ts.map