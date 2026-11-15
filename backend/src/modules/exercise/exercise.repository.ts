import { db } from "../../config/txContext.js";
import type {
  CreateExerciseDto,
  UpdateExerciseDto,
  FilterExercisesDto,
} from "./exercise.schema.js";
import type { MuscleGroup } from "@prisma/client";
import type { WriteStamp } from "../workout/workout.repository.js";

export class ExerciseRepository {
  async findAll(filters?: FilterExercisesDto & { userId?: string }) {
    const orConditions = [
      { creatorUserId: null },
      { creatorUserId: "1" },
      ...(filters?.userId ? [{ creatorUserId: filters.userId }] : []),
    ];

    const andConditions: any[] = [];

    if (filters?.muscleGroup) {
      andConditions.push({ muscleGroups: { has: filters.muscleGroup } });
    }

    if (filters?.name) {
      andConditions.push({
        name: { contains: filters.name, mode: "insensitive" },
      });
    }

    const where: any =
      andConditions.length > 0
        ? { AND: [{ OR: orConditions }, ...andConditions] }
        : { OR: orConditions };

    return await db().exercise.findMany({
      where,
      include: {
        photos: true,
        creator: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return await db().exercise.findUnique({
      where: { id },
      include: {
        photos: true,
        creator: true,
      },
    });
  }

  async create(data: CreateExerciseDto & { userId?: string; isGlobal?: boolean }, stamp?: WriteStamp) {
    const { photos, description, userId, isGlobal, ...exerciseData } = data;

    const createInput: any = {
      ...exerciseData,
      description: description ?? null,
      creatorUserId: isGlobal ? null : (userId || "1"),
      ...(stamp?.id !== undefined && { id: stamp.id }),
      ...(stamp?.createdAt !== undefined && { createdAt: stamp.createdAt }),
      ...(stamp?.updatedAt !== undefined && { updatedAt: stamp.updatedAt }),
    };

    if (photos && photos.length > 0) {
      createInput.photos = {
        create: photos,
      };
    }

    return await db().exercise.create({
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

  async update(id: string, data: UpdateExerciseDto, stamp?: WriteStamp) {
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

    if (stamp?.updatedAt !== undefined) {
      updateData.updatedAt = stamp.updatedAt;
    }

    return await db().exercise.update({
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
    return await db().exercise.delete({
      where: { id },
    });
  }

  async findByMuscleGroups(muscleGroups: MuscleGroup[]) {
    return await db().exercise.findMany({
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
      orderBy: { createdAt: "desc" },
    });
  }
}
