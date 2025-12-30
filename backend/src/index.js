import express, {} from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/database.js";
import { exerciseRouter } from "./modules/exercise/exercise.routes.js";
import userRouter from "./modules/user/user.routes.js";
import workoutRouter from "./modules/workout/workout.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
dotenv.config();
const app = express();
const PORT = process.env.API_PORT || 3000;
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/exercises", exerciseRouter);
app.use("/api/users", userRouter);
app.use("/api/workouts", workoutRouter);
app.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map