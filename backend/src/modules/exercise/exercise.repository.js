import prisma from '../../config/database.js';
export class ExerciseRepository {
    async findAll(filters) {
        const orConditions = [
            { creatorUserId: null },
            { creatorUserId: '1' },
            ...(filters?.userId ? [{ creatorUserId: filters.userId }] : [])
        ];
        const andConditions = [];
        if (filters?.muscleGroup) {
            andConditions.push({ muscleGroups: { has: filters.muscleGroup } });
        }
        if (filters?.name) {
            andConditions.push({ name: { contains: filters.name, mode: 'insensitive' } });
        }
        const where = andConditions.length > 0
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
    async findById(id) {
        return await prisma.exercise.findUnique({
            where: { id },
            include: {
                photos: true,
                creator: true,
            },
        });
    }
    async create(data) {
        const { photos, description, userId, ...exerciseData } = data;
        const createInput = {
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
    async update(id, data) {
        const updateData = {};
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
    async delete(id) {
        return await prisma.exercise.delete({
            where: { id },
        });
    }
    async findByMuscleGroups(muscleGroups) {
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
//# sourceMappingURL=exercise.repository.js.map