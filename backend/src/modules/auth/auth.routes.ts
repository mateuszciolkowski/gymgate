import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { authMiddleware } from "../../common/middleware/auth.js";
import { authRateLimiter } from "../../common/middleware/rateLimit.js";
import {
  registerSchema,
  loginSchema,
  mobileRegisterSchema,
  mobileLoginSchema,
  refreshTokenSchema,
  deleteAccountSchema,
} from "./auth.schema.js";

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
// Account deletion (D4): password confirmation; same brute-force limit as login.
router.delete("/account", authMiddleware, authRateLimiter, validate(deleteAccountSchema), authController.deleteAccount);


// Mobile sessions (access JWT 1 h + rotating refresh token). Same rate limit as login/register.
router.post("/mobile/register", authRateLimiter, validate(mobileRegisterSchema), authController.mobileRegister);
router.post("/mobile/login", authRateLimiter, validate(mobileLoginSchema), authController.mobileLogin);
router.post("/mobile/refresh", validate(refreshTokenSchema), authController.mobileRefresh);
router.post("/mobile/logout", validate(refreshTokenSchema), authController.mobileLogout);

export default router;
