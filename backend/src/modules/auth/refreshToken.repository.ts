import type { Prisma } from "@prisma/client";
import prisma from "../../config/database.js";

/** Prisma queries for mobile refresh tokens. No business rules here. */

export const transaction = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);

/** Finds a token by hash and locks its row for the rest of the transaction (serializes parallel refreshes). */
export const findByHashForUpdate = async (tx: Prisma.TransactionClient, tokenHash: string) => {
  await tx.$queryRaw`SELECT id FROM "refresh_tokens" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
  return tx.refreshToken.findUnique({ where: { tokenHash } });
};

export const findById = (tx: Prisma.TransactionClient, id: string) => tx.refreshToken.findUnique({ where: { id } });

export const create = (tx: Prisma.TransactionClient, data: Prisma.RefreshTokenUncheckedCreateInput) =>
  tx.refreshToken.create({ data });

export const update = (tx: Prisma.TransactionClient, id: string, data: Prisma.RefreshTokenUncheckedUpdateInput) =>
  tx.refreshToken.update({ where: { id }, data });

export const revokeFamily = (tx: Prisma.TransactionClient, familyId: string, at: Date) =>
  tx.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: at } });

/** Retention: expired or revoked tokens are useless after the cutoff. */
export const purgeBefore = async (cutoff: Date) =>
  (
    await prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
    })
  ).count;
