import { findUserById } from "./user.repository.js";

export const getUserById = async (id: string) => {
  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found");
  }
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
