import type { Request, Response } from 'express'
import { getUserById as getUser } from './user.service.js'

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await getUser(req.params.id)
    res.json(user)
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
