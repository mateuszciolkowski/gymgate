import { Router } from "express";
import { getUserById } from "./user.controller.js";
import { authMiddleware } from "../../common/middleware/auth.js";

const router = Router();

router.get("/:id", authMiddleware, getUserById);

export default router;
