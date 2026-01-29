import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!JWT_SECRET) {
      console.error("FATAL: JWT_SECRET is not defined");
      return res
        .status(500)
        .json({ success: false, error: "Błąd konfiguracji serwera" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "Brak tokenu autoryzacji" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, error: "Nieprawidłowy lub wygasły token" });
  }
};
