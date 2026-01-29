import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepo from "../user/user.repository.js";
import type { RegisterDto, LoginDto } from "./auth.schema.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

export const register = async (data: RegisterDto) => {
  const existingUser = await userRepo.findUserByEmail(data.email);
  if (existingUser) {
    throw new Error("Użytkownik z tym emailem już istnieje");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await userRepo.createUser({
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone ?? null,
  });

  if (!JWT_SECRET) {
    console.error(
      "FATAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
    throw new Error("Błąd konfiguracji serwera");
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const login = async (data: LoginDto) => {
  const user = await userRepo.findUserByEmail(data.email);
  if (!user) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  if (!JWT_SECRET) {
    console.error(
      "FATAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
    throw new Error("Błąd konfiguracji serwera");
  }

  try {
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  } catch (err) {
    console.error("JWT Signing Error:", err);
    throw new Error("Błąd podczas generowania sesji");
  }
};

export const verifyToken = (token: string) => {
  if (!JWT_SECRET) throw new Error("Błąd konfiguracji serwera");
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch (error) {
    throw new Error("Nieprawidłowy lub wygasły token");
  }
};

export const getUserFromToken = async (token: string) => {
  const decoded = verifyToken(token);
  const user = await userRepo.findUserById(decoded.userId);
  if (!user) {
    throw new Error("Użytkownik nie znaleziony");
  }
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
