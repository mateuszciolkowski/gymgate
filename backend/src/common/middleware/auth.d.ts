import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map