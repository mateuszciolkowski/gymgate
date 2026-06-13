import type { Request, Response } from "express";
import { sendError } from "../../common/errors.js";
import type { AuthRequest } from "../../common/middleware/auth.js";
import * as authService from "./auth.service.js";
import { getUserById } from "../user/user.service.js";

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

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserById(req.userId!);
    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
};
