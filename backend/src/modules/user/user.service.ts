import { NotFoundError } from "../../common/errors.js";
import { findUserById } from "./user.repository.js";

export const getUserById = async (id: string) => {
  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
