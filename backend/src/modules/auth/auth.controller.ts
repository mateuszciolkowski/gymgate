import type { Request, Response } from "express";
import { sendError } from "../../common/errors.js";
import type { AuthRequest } from "../../common/middleware/auth.js";
import * as authService from "./auth.service.js";
import * as mobileService from "./auth.mobile.service.js";
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

export const mobileRegister = async (req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, data: await mobileService.register(req.body) });
  } catch (error) {
    sendError(res, error);
  }
};

export const mobileLogin = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await mobileService.login(req.body) });
  } catch (error) {
    sendError(res, error);
  }
};

export const mobileRefresh = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await mobileService.refresh(req.body.refreshToken) });
  } catch (error) {
    sendError(res, error);
  }
};

export const mobileLogout = async (req: Request, res: Response) => {
  try {
    await mobileService.logout(req.body.refreshToken);
    res.json({ success: true, data: null });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await authService.deleteAccount(req.userId!, req.body.password);
    res.json({ success: true, data: null });
  } catch (error) {
    sendError(res, error);
  }
};
