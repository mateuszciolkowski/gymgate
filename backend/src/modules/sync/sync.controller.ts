import type { Response } from "express";
import { sendError } from "../../common/errors.js";
import type { AuthRequest } from "../../common/middleware/auth.js";
import * as syncService from "./sync.service.js";
import * as pullService from "./sync.pull.service.js";
import type { PullQuery, PushBody } from "./sync.schema.js";

export const push = async (req: AuthRequest, res: Response) => {
  try {
    const data = await syncService.push(req.userId!, req.userIsAdmin ?? false, req.body as PushBody);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};

export const pull = async (req: AuthRequest, res: Response) => {
  try {
    const data = await pullService.pull(req.userId!, req.query as PullQuery);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};
