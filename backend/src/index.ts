import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/database.js";
import { exerciseRouter } from "./modules/exercise/exercise.routes.js";
import userRouter from "./modules/user/user.routes.js";
import workoutRouter from "./modules/workout/workout.routes.js";
import authRouter from "./modules/auth/auth.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT) || 3000;

const originsEnv = process.env.ALLOWED_ORIGINS || "localhost:5173";
const allowedOrigins = originsEnv.split(",").map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
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
app.options("/{*splat}", cors());

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/exercises", exerciseRouter);
app.use("/api/users", userRouter);
app.use("/api/workouts", workoutRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
