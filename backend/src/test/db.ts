import bcrypt from "bcryptjs";
import prisma from "../config/database.js";

/**
 * Pomocnicy testów integracyjnych (*.itest.ts). Działają na prawdziwej bazie,
 * dlatego każda destrukcyjna funkcja najpierw sprawdza, że to baza testowa.
 */

const assertTestDatabase = (): void => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const dbName = url.pathname.replace(/^\//, "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !dbName.endsWith("_test")) {
    throw new Error(`Odmowa czyszczenia bazy "${url.hostname}/${dbName}": to nie jest lokalna baza testowa.`);
  }
};

/** Usuwa wszystkie dane (poza historią migracji) i zeruje sekwencje. */
export const resetDb = async (): Promise<void> => {
  assertTestDatabase();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
};

let userCounter = 0;

export const TEST_PASSWORD = "Test1234!";

export const createTestUser = async (overrides: { isAdmin?: boolean; id?: string } = {}) => {
  userCounter += 1;
  return prisma.user.create({
    data: {
      ...(overrides.id ? { id: overrides.id } : {}),
      email: `user${userCounter}-${Date.now()}@test.local`,
      // Koszt 4 zamiast domyślnego: hasło testowe, a testy mają być szybkie.
      password: await bcrypt.hash(TEST_PASSWORD, 4),
      firstName: "Test",
      lastName: `User${userCounter}`,
      isAdmin: overrides.isAdmin ?? false,
    },
  });
};

export const createTestExercise = (creatorUserId: string | null, name = "Wyciskanie") =>
  prisma.exercise.create({
    data: { name, muscleGroups: ["CHEST"], creatorUserId },
  });

export interface LoggedChange {
  seq: bigint;
  scopeUserId: string | null;
  entity: string;
  entityId: string;
}

/** Wpisy dziennika zmian nowsze niż `afterSeq`, w kolejności zapisu. */
export const changesAfter = async (afterSeq: bigint = 0n): Promise<LoggedChange[]> =>
  prisma.syncChange.findMany({
    where: { seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
    select: { seq: true, scopeUserId: true, entity: true, entityId: true },
  });

export const lastChangeSeq = async (): Promise<bigint> => {
  const last = await prisma.syncChange.findFirst({ orderBy: { seq: "desc" }, select: { seq: true } });
  return last?.seq ?? 0n;
};

export { prisma };
