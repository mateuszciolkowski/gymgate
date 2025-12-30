import { z } from 'zod';
export declare const muscleGroupSchema: z.ZodEnum<{
    CHEST: "CHEST";
    BACK: "BACK";
    SHOULDERS: "SHOULDERS";
    BICEPS: "BICEPS";
    TRICEPS: "TRICEPS";
    FOREARMS: "FOREARMS";
    ABS: "ABS";
    OBLIQUES: "OBLIQUES";
    LOWER_BACK: "LOWER_BACK";
    QUADS: "QUADS";
    HAMSTRINGS: "HAMSTRINGS";
    GLUTES: "GLUTES";
    CALVES: "CALVES";
    ADDUCTORS: "ADDUCTORS";
    HIP_FLEXORS: "HIP_FLEXORS";
    TRAPS: "TRAPS";
    LATS: "LATS";
    MIDDLE_BACK: "MIDDLE_BACK";
    NECK: "NECK";
    FULL_BODY: "FULL_BODY";
}>;
export declare const photoStageSchema: z.ZodEnum<{
    START: "START";
    MIDDLE: "MIDDLE";
    END: "END";
}>;
export declare const exercisePhotoSchema: z.ZodObject<{
    photoStage: z.ZodEnum<{
        START: "START";
        MIDDLE: "MIDDLE";
        END: "END";
    }>;
    photoUrl: z.ZodUnion<[z.ZodString, z.ZodString]>;
}, z.core.$strip>;
export declare const createExerciseSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        muscleGroups: z.ZodArray<z.ZodEnum<{
            CHEST: "CHEST";
            BACK: "BACK";
            SHOULDERS: "SHOULDERS";
            BICEPS: "BICEPS";
            TRICEPS: "TRICEPS";
            FOREARMS: "FOREARMS";
            ABS: "ABS";
            OBLIQUES: "OBLIQUES";
            LOWER_BACK: "LOWER_BACK";
            QUADS: "QUADS";
            HAMSTRINGS: "HAMSTRINGS";
            GLUTES: "GLUTES";
            CALVES: "CALVES";
            ADDUCTORS: "ADDUCTORS";
            HIP_FLEXORS: "HIP_FLEXORS";
            TRAPS: "TRAPS";
            LATS: "LATS";
            MIDDLE_BACK: "MIDDLE_BACK";
            NECK: "NECK";
            FULL_BODY: "FULL_BODY";
        }>>;
        description: z.ZodOptional<z.ZodString>;
        photos: z.ZodOptional<z.ZodArray<z.ZodObject<{
            photoStage: z.ZodEnum<{
                START: "START";
                MIDDLE: "MIDDLE";
                END: "END";
            }>;
            photoUrl: z.ZodUnion<[z.ZodString, z.ZodString]>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateExerciseSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        muscleGroups: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            CHEST: "CHEST";
            BACK: "BACK";
            SHOULDERS: "SHOULDERS";
            BICEPS: "BICEPS";
            TRICEPS: "TRICEPS";
            FOREARMS: "FOREARMS";
            ABS: "ABS";
            OBLIQUES: "OBLIQUES";
            LOWER_BACK: "LOWER_BACK";
            QUADS: "QUADS";
            HAMSTRINGS: "HAMSTRINGS";
            GLUTES: "GLUTES";
            CALVES: "CALVES";
            ADDUCTORS: "ADDUCTORS";
            HIP_FLEXORS: "HIP_FLEXORS";
            TRAPS: "TRAPS";
            LATS: "LATS";
            MIDDLE_BACK: "MIDDLE_BACK";
            NECK: "NECK";
            FULL_BODY: "FULL_BODY";
        }>>>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getExerciseSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const filterExercisesSchema: z.ZodObject<{
    query: z.ZodObject<{
        muscleGroup: z.ZodOptional<z.ZodEnum<{
            CHEST: "CHEST";
            BACK: "BACK";
            SHOULDERS: "SHOULDERS";
            BICEPS: "BICEPS";
            TRICEPS: "TRICEPS";
            FOREARMS: "FOREARMS";
            ABS: "ABS";
            OBLIQUES: "OBLIQUES";
            LOWER_BACK: "LOWER_BACK";
            QUADS: "QUADS";
            HAMSTRINGS: "HAMSTRINGS";
            GLUTES: "GLUTES";
            CALVES: "CALVES";
            ADDUCTORS: "ADDUCTORS";
            HIP_FLEXORS: "HIP_FLEXORS";
            TRAPS: "TRAPS";
            LATS: "LATS";
            MIDDLE_BACK: "MIDDLE_BACK";
            NECK: "NECK";
            FULL_BODY: "FULL_BODY";
        }>>;
        name: z.ZodOptional<z.ZodString>;
        creatorUserId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateExerciseDto = z.infer<typeof createExerciseSchema>['body'];
export type UpdateExerciseDto = z.infer<typeof updateExerciseSchema>['body'];
export type FilterExercisesDto = z.infer<typeof filterExercisesSchema>['query'];
//# sourceMappingURL=exercise.schema.d.ts.map