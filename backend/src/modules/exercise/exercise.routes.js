import { Router } from "express";
import { ExerciseController } from "./exercise.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { authMiddleware } from "../../common/middleware/auth.js";
import { createExerciseSchema, updateExerciseSchema, getExerciseSchema, filterExercisesSchema, } from "./exercise.schema.js";
const router = Router();
const controller = new ExerciseController();
router.get("/", authMiddleware, validate(filterExercisesSchema), controller.getAll);
router.get("/:id", authMiddleware, validate(getExerciseSchema), controller.getById);
router.post("/", authMiddleware, validate(createExerciseSchema), controller.create);
router.patch("/:id", authMiddleware, validate(updateExerciseSchema), controller.update);
router.delete("/:id", authMiddleware, validate(getExerciseSchema), controller.delete);
export { router as exerciseRouter };
//# sourceMappingURL=exercise.routes.js.map