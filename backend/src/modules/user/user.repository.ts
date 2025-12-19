import prisma from '../../config/database.js'
import type { Prisma } from '@prisma/client'

export const findUserById = (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  })
}


export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  })
}

export const createUser = (data: Prisma.UserCreateInput) => {
  return prisma.user.create({
    data,
  })
}

export const updateUser = (id: string, data: Prisma.UserUpdateInput) => {
  return prisma.user.update({
    where: { id },
    data,
  })
}

export const deleteUser = (id: string) => {
  return prisma.user.delete({
    where: { id },
  })
}
