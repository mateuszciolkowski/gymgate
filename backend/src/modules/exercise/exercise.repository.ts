import prisma from '../../config/database.js';
import type { CreateExerciseDto, UpdateExerciseDto, FilterExercisesDto } from './exercise.schema.js';
import type { MuscleGroup } from '@prisma/client';

export class ExerciseRepository {
  async findAll(filters?: FilterExercisesDto & { userId?: string }) {
    const orConditions = [
      { creatorUserId: null },
      { creatorUserId: '1' },
      ...(filters?.userId ? [{ creatorUserId: filters.userId }] : [])
    ];

    const andConditions: any[] = [];
    
    if (filters?.muscleGroup) {
      andConditions.push({ muscleGroups: { has: filters.muscleGroup } });
    }
    
    if (filters?.name) {
      andConditions.push({ name: { contains: filters.name, mode: 'insensitive' } });
    }

    const where: any = andConditions.length > 0 
      ? { AND: [{ OR: orConditions }, ...andConditions] }
      : { OR: orConditions };

    return await prisma.exercise.findMany({
      where,
      include: {
        photos: true,
        creator: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return await prisma.exercise.findUnique({
      where: { id },
      include: {
        photos: true,
        creator: true,
      },
    });
  }

  async create(data: CreateExerciseDto & { userId?: string }) {
    const { photos, description, userId, ...exerciseData } = data;

    const createInput: any = {
      ...exerciseData,
      description: description ?? null,
      creatorUserId: userId || '1',
    };

    if (photos && photos.length > 0) {
      createInput.photos = {
        create: photos,
      };
    }

    return await prisma.exercise.create({
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
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.muscleGroups !== undefined) {
      updateData.muscleGroups = data.muscleGroups;
    }
    
    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    return await prisma.exercise.update({
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
    return await prisma.exercise.delete({
      where: { id },
    });
  }

  async findByMuscleGroups(muscleGroups: MuscleGroup[]) {
    return await prisma.exercise.findMany({
      where: {
        muscleGroups: { hasSome: muscleGroups },
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
      orderBy: { createdAt: 'desc' },
    });
  }
}
