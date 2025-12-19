import { z } from 'zod';
import { MuscleGroup, PhotoStage } from '@prisma/client';

export const muscleGroupSchema = z.nativeEnum(MuscleGroup);
export const photoStageSchema = z.nativeEnum(PhotoStage);

export const exercisePhotoSchema = z.object({
  photoStage: photoStageSchema,
  photoUrl: z.string().url().or(z.string().min(1)),
});

export const createExerciseSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200),
    muscleGroups: z.array(muscleGroupSchema).min(1, 'At least one muscle group is required'),
    description: z.string().optional(),
    photos: z.array(exercisePhotoSchema).optional(),
  }),
});

export const updateExerciseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    muscleGroups: z.array(muscleGroupSchema).min(1).optional(),
    description: z.string().optional(),
  }),
});

export const getExerciseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const filterExercisesSchema = z.object({
  query: z.object({
    muscleGroup: muscleGroupSchema.optional(),
    name: z.string().optional(),
    creatorUserId: z.string().optional(),
  }),
});

export type CreateExerciseDto = z.infer<typeof createExerciseSchema>['body'];
export type UpdateExerciseDto = z.infer<typeof updateExerciseSchema>['body'];
export type FilterExercisesDto = z.infer<typeof filterExercisesSchema>['query'];
