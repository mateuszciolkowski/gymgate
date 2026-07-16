import "dotenv/config";

import prisma from "./config/database.js";
import { createApp } from "./app.js";

const app = createApp();

// Railway uses PORT, locally API_PORT
const PORT: number =
  Number(process.env.PORT) || Number(process.env.API_PORT) || 3000;
console.log(`📌 Using PORT: ${PORT}`);

process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  console.error("WARNING: Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err: Error) => {
  console.error("WARNING: Uncaught Exception:", err.message);
  console.error("STACK:", err.stack);
});

// Graceful shutdown - close Prisma connections on exit
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  await prisma.$disconnect();
  console.log("✅ Prisma disconnected");
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 GymGate API LIVE at: http://0.0.0.0:${PORT}`);
});

// Timeout for slow requests
server.timeout = 30000;
