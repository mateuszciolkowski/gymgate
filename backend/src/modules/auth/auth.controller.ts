import type { Request, Response } from "express";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes("już istnieje")
        ? 409
        : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes("Nieprawidłowy")
        ? 401
        : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "Brak tokenu autoryzacji" });
    }

    const user = await authService.getUserFromToken(token);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
