import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as userRepo from "../user/user.repository.js";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../common/errors.js";
import { BUILT_IN_USER_ID } from "../../config/constants.js";
import type { RegisterDto, LoginDto } from "./auth.schema.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

type TokenUser = { id: string; email: string; isAdmin: boolean };

/** Signs the access JWT (same payload for the PWA's 7-day token and the mobile 1-hour token). */
export const signAccessToken = (user: TokenUser, expiresIn: jwt.SignOptions["expiresIn"] = JWT_EXPIRES_IN) => {
  if (!JWT_SECRET) {
    console.error(
      "FATAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
    throw new Error("Błąd konfiguracji serwera");
  }
  try {
    return jwt.sign({ userId: user.id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn });
  } catch (err) {
    console.error("JWT Signing Error:", err);
    throw new Error("Błąd podczas generowania sesji");
  }
};

export const createAccount = async (data: RegisterDto) => {
  const existingUser = await userRepo.findUserByEmail(data.email);
  if (existingUser) {
    throw new ConflictError("Użytkownik z tym emailem już istnieje");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return userRepo.createUser({
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone ?? null,
  });
};

export const verifyCredentials = async (data: LoginDto) => {
  const user = await userRepo.findUserByEmail(data.email);
  if (!user) {
    throw new UnauthorizedError("Nieprawidłowy email lub hasło");
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Nieprawidłowy email lub hasło");
  }
  return user;
};

export const register = async (data: RegisterDto) => {
  const user = await createAccount(data);
  const token = signAccessToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const login = async (data: LoginDto) => {
  const user = await verifyCredentials(data);
  const token = signAccessToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

/**
 * Deletes the account and, through the FK cascades (exercises, workouts and their items/sets,
 * stats, pending notes, plans, favorites, sync operations, refresh tokens), all its data in one
 * DELETE statement, i.e. one transaction. Wrong password -> 403 (not 401: clients treat 401 as
 * "session expired" and would log the user out).
 */
export const deleteAccount = async (userId: string, password: string) => {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("Użytkownik nie znaleziony");
  }
  // The legacy "global" creator id owns the global catalogue; deleting it would delete the catalogue.
  if (user.id === BUILT_IN_USER_ID) {
    throw new ForbiddenError("Tego konta nie można usunąć");
  }
  if (!(await bcrypt.compare(password, user.password))) {
    throw new ForbiddenError("Nieprawidłowe hasło");
  }
  await userRepo.deleteUser(userId);
};

export const verifyToken = (token: string) => {
  if (!JWT_SECRET) throw new Error("Błąd konfiguracji serwera");
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch (error) {
    throw new UnauthorizedError("Nieprawidłowy lub wygasły token");
  }
};

export const getUserFromToken = async (token: string) => {
  const decoded = verifyToken(token);
  const user = await userRepo.findUserById(decoded.userId);
  if (!user) {
    // 401 (not 404): a valid token without an existing user should force logout
    throw new UnauthorizedError("Użytkownik nie znaleziony");
  }
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
