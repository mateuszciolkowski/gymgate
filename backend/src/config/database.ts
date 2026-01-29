import { PrismaClient } from "@prisma/client";

console.log("📦 Initializing Prisma Client...");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Dodaj connection_limit do URL jeśli go nie ma
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || "";
  if (url.includes("connection_limit")) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=3`;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasourceUrl: getDatabaseUrl(),
  });

// Singleton w KAŻDYM środowisku (nie tylko dev)
globalForPrisma.prisma = prisma;

console.log("✅ Prisma Client initialized with connection limit");

export default prisma;
