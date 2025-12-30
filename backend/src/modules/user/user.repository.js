import prisma from '../../config/database.js';
export const findUserById = (id) => {
    return prisma.user.findUnique({
        where: { id },
    });
};
export const findUserByEmail = (email) => {
    return prisma.user.findUnique({
        where: { email },
    });
};
export const createUser = (data) => {
    return prisma.user.create({
        data,
    });
};
export const updateUser = (id, data) => {
    return prisma.user.update({
        where: { id },
        data,
    });
};
export const deleteUser = (id) => {
    return prisma.user.delete({
        where: { id },
    });
};
//# sourceMappingURL=user.repository.js.map