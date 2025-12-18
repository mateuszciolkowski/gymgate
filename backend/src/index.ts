import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

app.use(cors());
app.use(express.json());

// Testowy endpoint
app.get('/ping', async (req: Request, res: Response) => {
  try {
    // Prosty test bazy
    await prisma.$queryRaw`SELECT 1`;
    res.json({ message: 'Pong! Database is connected.' });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});