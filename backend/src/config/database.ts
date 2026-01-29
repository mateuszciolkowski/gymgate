import { PrismaClient } from "@prisma/client";

console.log("📦 Initializing Prisma Client...");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Singleton w KAŻDYM środowisku (nie tylko dev)
globalForPrisma.prisma = prisma;

console.log("✅ Prisma Client initialized");

export default prisma;
