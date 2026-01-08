import prisma from "../../config/database.js";
export const createWorkout = (data) => {
    return prisma.workout.create({
        data,
        include: {
            items: {
                include: {
                    exercise: true,
                    sets: true,
                },
                orderBy: { orderInWorkout: "asc" },
            },
        },
    });
};
export const findWorkoutById = (id) => {
    return prisma.workout.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    exercise: {
                        include: {
                            photos: true,
                        },
                    },
                    sets: {
                        orderBy: { setNumber: "asc" },
                    },
                },
                orderBy: { orderInWorkout: "asc" },
            },
        },
    });
};
export const findWorkoutsByUser = (userId, filters) => {
    return prisma.workout.findMany({
        where: {
            userId,
            ...(filters?.status && { status: filters.status }),
        },
        include: {
            items: {
                include: {
                    exercise: true,
                    sets: true,
                },
                orderBy: { orderInWorkout: "asc" },
            },
        },
        orderBy: { workoutDate: "desc" },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset !== undefined && { skip: filters.offset }),
    });
};
export const updateWorkout = (id, data) => {
    return prisma.workout.update({
        where: { id },
        data,
        include: {
            items: {
                include: {
                    exercise: true,
                    sets: true,
                },
                orderBy: { orderInWorkout: "asc" },
            },
        },
    });
};
export const deleteWorkout = (id) => {
    return prisma.workout.delete({
        where: { id },
    });
};
export const addExerciseToWorkout = (workoutId, exerciseId, orderInWorkout, notes) => {
    return prisma.workoutItem.create({
        data: {
            workoutId,
            exerciseId,
            orderInWorkout,
            notes: notes ?? null,
        },
        include: {
            exercise: {
                include: {
                    photos: true,
                },
            },
            sets: true,
        },
    });
};
export const findWorkoutItemById = (id) => {
    return prisma.workoutItem.findUnique({
        where: { id },
        include: {
            exercise: true,
            sets: {
                orderBy: { setNumber: "asc" },
            },
        },
    });
};
export const updateWorkoutItem = (id, data) => {
    return prisma.workoutItem.update({
        where: { id },
        data,
        include: {
            exercise: true,
            sets: true,
        },
    });
};
export const deleteWorkoutItem = (id) => {
    return prisma.workoutItem.delete({
        where: { id },
    });
};
export const getMaxOrderInWorkout = async (workoutId) => {
    const result = await prisma.workoutItem.aggregate({
        where: { workoutId },
        _max: { orderInWorkout: true },
    });
    return result._max.orderInWorkout || 0;
};
export const addSetToWorkoutItem = (itemId, weight, repetitions, setNumber) => {
    return prisma.workoutSet.create({
        data: {
            itemId,
            weight,
            repetitions,
            setNumber,
        },
    });
};
export const findWorkoutSetById = (id) => {
    return prisma.workoutSet.findUnique({
        where: { id },
    });
};
export const updateWorkoutSet = (id, data) => {
    return prisma.workoutSet.update({
        where: { id },
        data,
    });
};
export const deleteWorkoutSet = (id) => {
    return prisma.workoutSet.delete({
        where: { id },
    });
};
export const getMaxSetNumber = async (itemId) => {
    const result = await prisma.workoutSet.aggregate({
        where: { itemId },
        _max: { setNumber: true },
    });
    return result._max.setNumber || 0;
};
export const getExerciseStats = (userId, exerciseId) => {
    return prisma.exerciseUserStats.findUnique({
        where: {
            userId_exerciseId: {
                userId,
                exerciseId,
            },
        },
    });
};
export const getAllUserStats = (userId) => {
    return prisma.exerciseUserStats.findMany({
        where: { userId },
        include: {
            exercise: true,
        },
        orderBy: { maxWeight: "desc" },
    });
};
export const upsertExerciseStats = (userId, exerciseId, data) => {
    return prisma.exerciseUserStats.upsert({
        where: {
            userId_exerciseId: {
                userId,
                exerciseId,
            },
        },
        create: {
            userId,
            exerciseId,
            ...data,
            totalWorkouts: data.totalWorkouts || 1,
        },
        update: data,
    });
};
export const setActiveWorkout = (userId, workoutId) => {
    return prisma.user.update({
        where: { id: userId },
        data: { activeWorkoutId: workoutId },
    });
};
export const getActiveWorkout = (userId) => {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { activeWorkoutId: true },
    });
};
export const clearActiveWorkout = (userId) => {
    return prisma.user.update({
        where: { id: userId },
        data: { activeWorkoutId: null },
    });
};
//# sourceMappingURL=workout.repository.js.map