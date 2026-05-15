import { Router } from "express";
import { PlanController } from "./plan.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { authMiddleware } from "../../common/middleware/auth.js";
import {
  createPlanSchema,
  updatePlanSchema,
  getPlanSchema,
  listPlansSchema,
} from "./plan.schema.js";

const router = Router();
const controller = new PlanController();

router.get("/", authMiddleware, validate(listPlansSchema), controller.getAll);

router.get(
  "/:id",
  authMiddleware,
  validate(getPlanSchema),
  controller.getById,
);

router.post("/", authMiddleware, validate(createPlanSchema), controller.create);

router.put(
  "/:id",
  authMiddleware,
  validate(updatePlanSchema),
  controller.update,
);

router.delete(
  "/:id",
  authMiddleware,
  validate(getPlanSchema),
  controller.delete,
);

router.post(
  "/:id/duplicate",
  authMiddleware,
  validate(getPlanSchema),
  controller.duplicate,
);

export { router as planRouter };
