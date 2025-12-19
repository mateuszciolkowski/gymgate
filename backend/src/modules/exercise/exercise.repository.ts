import prisma from '../../config/database.js';
import type { CreateExerciseDto, UpdateExerciseDto, FilterExercisesDto } from './exercise.schema.js';
import type { MuscleGroup } from '@prisma/client';

export class ExerciseRepository {
  async findAll(filters?: FilterExercisesDto) {
    const where: any = {};

    if (filters?.muscleGroup) {
      where.muscleGroups = {
        has: filters.muscleGroup,
      };
    }

    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters?.creatorUserId) {
      where.creatorUserId = filters.creatorUserId;
    }

    return prisma.exercise.findMany({
      where,
      include: {
        photos: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return prisma.exercise.findUnique({
      where: { id },
      include: {
        photos: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

 async create(data: CreateExerciseDto) {
  const { photos, description, ...exerciseData } = data;

  const createInput: any = {
    ...exerciseData,
    description: description ?? null,
    creatorUserId: '1',
  };

  if (photos && photos.length > 0) {
    createInput.photos = {
      create: photos,
    };
  }

  return prisma.exercise.create({
    data: createInput,
    include: {
      photos: true,
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

  async update(id: string, data: UpdateExerciseDto) {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.muscleGroups !== undefined) updateData.muscleGroups = data.muscleGroups;
  
  if (data.description !== undefined) {
    updateData.description = data.description ?? null;
  }

  return prisma.exercise.update({
    where: { id },
    data: updateData,
    include: {
      photos: true,
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

  async delete(id: string) {
    return prisma.exercise.delete({
      where: { id },
    });
  }

  async findByMuscleGroups(muscleGroups: MuscleGroup[]) {
    return prisma.exercise.findMany({
      where: {
        muscleGroups: {
          hasSome: muscleGroups,
        },
      },
      include: {
        photos: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
