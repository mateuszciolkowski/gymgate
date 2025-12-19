import { Router } from 'express';
import { ExerciseController } from './exercise.controller.js';
import { validate } from '../../common/middleware/validate.js';
import {
  createExerciseSchema,
  updateExerciseSchema,
  getExerciseSchema,
  filterExercisesSchema,
} from './exercise.schema.js';

const router = Router();
const controller = new ExerciseController();

router.get('/', validate(filterExercisesSchema), controller.getAll);

router.get('/:id', validate(getExerciseSchema), controller.getById);

router.post('/', validate(createExerciseSchema), controller.create);

router.patch('/:id', validate(updateExerciseSchema), controller.update);

router.delete('/:id', validate(getExerciseSchema), controller.delete);

export { router as exerciseRouter };