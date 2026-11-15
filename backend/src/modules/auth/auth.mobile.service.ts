import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { UnauthorizedError } from "../../common/errors.js";
import * as userRepo from "../user/user.repository.js";
import * as repo from "./refreshToken.repository.js";
import { createAccount, signAccessToken, verifyCredentials } from "./auth.service.js";
import type { MobileLoginDto, MobileRegisterDto } from "./auth.schema.js";

/**
 * Mobile sessions (PLAN 7): 1 h access JWT (same format as the PWA token) + random refresh token,
 * stored only as a SHA-256 hash, 180 days sliding.
 *
 * Rotation tolerates a lost response: the PREVIOUS refresh token stays valid until its successor
 * has been presented for the first time. Presenting a token whose successor was already used (or
 * any older one) is treated as theft and revokes the whole family (all tokens of that login).
 */

export const ACCESS_TTL_SECONDS = 60 * 60;
export const REFRESH_TTL_MS = 180 * 24 * 60 * 60 * 1000;

const INVALID = "Nieprawidłowy lub wygasły token odświeżania";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

type SessionUser = { id: string; email: string; isAdmin: boolean; password: string };
type Device = { deviceId?: string | undefined; deviceName?: string | undefined };

const issueRefreshToken = async (
  tx: Prisma.TransactionClient,
  userId: string,
  familyId: string,
  device: Device,
  now: Date,
) => {
  const token = randomBytes(32).toString("base64url");
  const row = await repo.create(tx, {
    userId,
    familyId,
    tokenHash: hashToken(token),
    deviceId: device.deviceId ?? "unknown",
    deviceName: device.deviceName ?? null,
    expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
  });
  return { token, row };
};

const sessionResponse = (user: SessionUser, refresh: { token: string; row: { expiresAt: Date } }) => {
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    accessToken: signAccessToken(user, ACCESS_TTL_SECONDS),
    accessTokenExpiresIn: ACCESS_TTL_SECONDS,
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.row.expiresAt,
  };
};

const startSession = async (user: SessionUser, device: Device) => {
  const now = new Date();
  const refresh = await repo.transaction((tx) => issueRefreshToken(tx, user.id, randomUUID(), device, now));
  return sessionResponse(user, refresh);
};

export const register = async (data: MobileRegisterDto) =>
  startSession(await createAccount(data), { deviceId: data.deviceId, deviceName: data.deviceName });

export const login = async (data: MobileLoginDto) =>
  startSession(await verifyCredentials(data), { deviceId: data.deviceId, deviceName: data.deviceName });

export const refresh = async (refreshToken: string) => {
  const now = new Date();

  const outcome = await repo.transaction(async (tx) => {
    const current = await repo.findByHashForUpdate(tx, hashToken(refreshToken));
    if (!current || current.revokedAt || current.expiresAt.getTime() <= now.getTime()) return null;

    if (current.replacedById) {
      const successor = await repo.findById(tx, current.replacedById);
      if (successor?.lastUsedAt) {
        // The successor was already used: this token is older than the previous one. Theft signal.
        await repo.revokeFamily(tx, current.familyId, now);
        return null;
      }
    }

    const user = await userRepo.findUserById(current.userId);
    if (!user) return null;

    const next = await issueRefreshToken(
      tx,
      current.userId,
      current.familyId,
      { deviceId: current.deviceId, deviceName: current.deviceName ?? undefined },
      now,
    );
    await repo.update(tx, current.id, { lastUsedAt: now, replacedById: next.row.id });
    return { user, next };
  });

  if (!outcome) throw new UnauthorizedError(INVALID);
  return sessionResponse(outcome.user, outcome.next);
};

/** Revokes the whole family of the presented token. Unknown tokens succeed (idempotent logout). */
export const logout = async (refreshToken: string) => {
  await repo.transaction(async (tx) => {
    const current = await repo.findByHashForUpdate(tx, hashToken(refreshToken));
    if (current) await repo.revokeFamily(tx, current.familyId, new Date());
  });
};

export const purgeExpiredRefreshTokens = (now = new Date()) =>
  repo.purgeBefore(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
