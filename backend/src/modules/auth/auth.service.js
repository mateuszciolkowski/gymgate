import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepo from "../user/user.repository.js";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";
export const register = async (data) => {
    // Check if user exists
    const existingUser = await userRepo.findUserByEmail(data.email);
    if (existingUser) {
        throw new Error("Użytkownik z tym emailem już istnieje");
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Create user
    const user = await userRepo.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
    });
    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};
export const login = async (data) => {
    // Find user
    const user = await userRepo.findUserByEmail(data.email);
    if (!user) {
        throw new Error("Nieprawidłowy email lub hasło");
    }
    // Check password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
        throw new Error("Nieprawidłowy email lub hasło");
    }
    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Error("Nieprawidłowy lub wygasły token");
    }
};
export const getUserFromToken = async (token) => {
    const decoded = verifyToken(token);
    const user = await userRepo.findUserById(decoded.userId);
    if (!user) {
        throw new Error("Użytkownik nie znaleziony");
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};
//# sourceMappingURL=auth.service.js.map