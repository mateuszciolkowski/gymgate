import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/database.js";
import { exerciseRouter } from "./modules/exercise/exercise.routes.js";
import userRouter from "./modules/user/user.routes.js";
import workoutRouter from "./modules/workout/workout.routes.js";
import authRouter from "./modules/auth/auth.routes.js";

dotenv.config();

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

const PORT: number = Number(process.env.API_PORT) || 3000;

const originsEnv: string =
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://gymgate.vercel.app";
const allowedOrigins: string[] = originsEnv
  .split(",")
  .map((origin) => origin.trim());

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
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Vary", "Origin");
  next();
});

app.options("/*splat", cors() as any);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/exercises", exerciseRouter);
app.use("/api/users", userRouter);
app.use("/api/workouts", workoutRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error Handler:", err.message);
  console.error("Stack:", err.stack);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("WARNING: Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err: Error) => {
  console.error("WARNING: Uncaught Exception:", err.message);
  console.error("STACK:", err.stack);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 GymGate API LIVE at: http://0.0.0.0:${PORT}`);
});
