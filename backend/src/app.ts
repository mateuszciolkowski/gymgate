import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { ZodError } from "zod";

import { AppError } from "./common/errors.js";
import { exerciseRouter } from "./modules/exercise/exercise.routes.js";
import userRouter from "./modules/user/user.routes.js";
import workoutRouter from "./modules/workout/workout.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { planRouter } from "./modules/plan/plan.routes.js";

// Prisma returns BigInt for some aggregate fields — serialize it as a string.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const parseAllowedOrigins = (): string[] => {
  const originsEnv =
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173,https://gymgate.vercel.app";
  return originsEnv.split(",").map((origin) => origin.trim());
};

/**
 * Builds and configures the Express app without starting the listener.
 * This makes it testable via supertest (createApp()).
 */
export const createApp = (): Express => {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  app.use(
    cors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error(`CORS policy: Origin ${origin} not allowed`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Vary", "Origin");
    next();
  });

  app.use(express.json());

  // Health checks
  app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok", message: "GymGate API is running" });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/exercises", exerciseRouter);
  app.use("/api/users", userRouter);
  app.use("/api/workouts", workoutRouter);
  app.use("/api/plans", planRouter);

  // Centralny error-handler: AppError -> jego status, ZodError -> 400, reszta -> 500.
  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof AppError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }

      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }

      console.error("Unhandled error:", err.message);
      console.error("Stack:", err.stack);
      res.status(500).json({ success: false, error: "Internal server error" });
    },
  );

  return app;
};

export default createApp;
