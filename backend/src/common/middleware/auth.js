import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({ success: false, error: "Brak tokenu autoryzacji" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    }
    catch (error) {
        res
            .status(401)
            .json({ success: false, error: "Nieprawidłowy lub wygasły token" });
    }
};
//# sourceMappingURL=auth.js.map