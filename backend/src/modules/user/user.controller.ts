import type { Response } from "express";
import { sendError, BadRequestError, ForbiddenError } from "../../common/errors.js";
import type { AuthRequest } from "../../common/middleware/auth.js";
import { getUserById as getUser } from "./user.service.js";

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError("User ID is required");
    }

    // Only the account owner or an administrator may fetch the user's data.
    if (req.userId !== id && !req.userIsAdmin) {
      throw new ForbiddenError("Brak uprawnień do danych tego użytkownika");
    }

    const user = await getUser(id);
    res.json({ success: true, data: user });
  } catch (error) {
    sendError(res, error);
  }
};
