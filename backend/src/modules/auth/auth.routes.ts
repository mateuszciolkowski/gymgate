import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { registerSchema, loginSchema } from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authController.getCurrentUser);

export default router;
