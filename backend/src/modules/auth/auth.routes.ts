import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { authMiddleware } from "../../common/middleware/auth.js";
import { authRateLimiter } from "../../common/middleware/rateLimit.js";
import { registerSchema, loginSchema } from "./auth.schema.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);
router.get("/me", authMiddleware, authController.getCurrentUser);

export default router;
