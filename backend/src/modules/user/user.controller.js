import { getUserById as getUser } from "./user.service.js";
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const user = await getUser(id);
        res.json(user);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: "An unknown error occurred",
            });
        }
    }
};
//# sourceMappingURL=user.controller.js.map