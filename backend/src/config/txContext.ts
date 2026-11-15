import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "@prisma/client";
import prisma from "./database.js";

/**
 * Ambient transaction for the sync module.
 *
 * Repositories call `db()` instead of the global client. Outside `runInUserTx`
 * it is the plain singleton, so every PWA code path behaves exactly as before.
 * Inside it, all repository calls (and the existing services built on them) run
 * on ONE interactive transaction that already holds the user-row lock; this is
 * what lets sync reuse the services without deadlocking on its own lock.
 */
const storage = new AsyncLocalStorage<Prisma.TransactionClient>();

export const db = (): Prisma.TransactionClient => storage.getStore() ?? prisma;

/** Nested transaction blocks join the ambient one; otherwise open a new one. */
export const runInTx = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  const ambient = storage.getStore();
  return ambient ? fn(ambient) : prisma.$transaction(fn);
};

/** One transaction that starts by locking the user row (serializes writes of one account). */
export const runInUserTx = <T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> =>
  prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
      return storage.run(tx, () => fn(tx));
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
