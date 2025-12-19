import { findUserById } from './user.repository'

export const getUserById = async (id: string) => {
  const user = await findUserById(id)
  if (!user) {
    throw new Error('User not found')
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}
