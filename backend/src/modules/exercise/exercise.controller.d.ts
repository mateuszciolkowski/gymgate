import type { Request, Response } from "express";
import type { AuthRequest } from "../../common/middleware/auth.js";
export declare class ExerciseController {
    private service;
    constructor();
    getAll(req: AuthRequest, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=exercise.controller.d.ts.map