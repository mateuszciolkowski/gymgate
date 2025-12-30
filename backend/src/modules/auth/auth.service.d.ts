import type { RegisterDto, LoginDto } from "./auth.schema.js";
export declare const register: (data: RegisterDto) => Promise<{
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        updatedAt: Date;
        activeWorkoutId: string | null;
    };
    token: string;
}>;
export declare const login: (data: LoginDto) => Promise<{
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        updatedAt: Date;
        activeWorkoutId: string | null;
    };
    token: string;
}>;
export declare const verifyToken: (token: string) => {
    userId: string;
    email: string;
};
export declare const getUserFromToken: (token: string) => Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}>;
//# sourceMappingURL=auth.service.d.ts.map