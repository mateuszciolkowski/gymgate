import { PrismaClient } from "@prisma/client";

console.log("📦 Initializing Prisma Client...");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () => {
  const isLocal = process.env.DB_ENV === "local";
  const rawUrl = (isLocal ? process.env.DATABASE_URL_LOCAL : process.env.DATABASE_URL) || "";
  if (isLocal) console.log("🏠 DB_ENV=local → connecting to local PostgreSQL (5433)");
  if (rawUrl.includes("connection_limit")) return rawUrl;
  const separator = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${separator}connection_limit=3`;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasourceUrl: getDatabaseUrl(),
  });

// Singleton in EVERY environment (not just dev)
globalForPrisma.prisma = prisma;

console.log("✅ Prisma Client initialized with connection limit");

export default prisma;
