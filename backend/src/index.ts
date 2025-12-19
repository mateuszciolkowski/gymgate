import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database.js';
import { exerciseRouter } from './modules/exercise/exercise.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(cors());
app.use(express.json());


app.use('/api/exercises', exerciseRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});