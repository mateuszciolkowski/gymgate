import type { Request, Response } from "express";
import { sendError, UnauthorizedError } from "../../common/errors.js";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      throw new UnauthorizedError("Brak tokenu autoryzacji");
    }

    const user = await authService.getUserFromToken(token);
    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
};
