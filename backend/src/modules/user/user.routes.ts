import { Router } from 'express'
import { getUserById } from './user.controller.js'

const router = Router()

router.get('/:id', getUserById)

export default router
