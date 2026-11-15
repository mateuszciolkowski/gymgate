import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { syncRateLimiter } from "../../common/middleware/rateLimit.js";
import * as syncController from "./sync.controller.js";
import { pushSchema } from "./sync.schema.js";

export const syncRouter = Router();

syncRouter.use(authMiddleware);

// Limiter after auth: it is keyed by user id.
syncRouter.post("/push", syncRateLimiter, validate(pushSchema), syncController.push);
