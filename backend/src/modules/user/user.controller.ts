import type { Request, Response } from "express";
import { sendError, BadRequestError } from "../../common/errors.js";
import { getUserById as getUser } from "./user.service.js";

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("User ID is required");
    }

    const user = await getUser(id);
    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
};
