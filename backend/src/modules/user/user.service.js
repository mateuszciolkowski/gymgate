import { findUserById } from './user.repository';
export const getUserById = async (id) => {
    const user = await findUserById(id);
    if (!user) {
        throw new Error('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};
//# sourceMappingURL=user.service.js.map