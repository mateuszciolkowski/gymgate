import type { Request, Response } from "express";
import { sendError, ForbiddenError } from "../../common/errors.js";
import { ExerciseService } from "./exercise.service.js";
import type { AuthRequest } from "../../common/middleware/auth.js";

export class ExerciseController {
  private service: ExerciseService;

  constructor() {
    this.service = new ExerciseService();

    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const filters = {
        muscleGroup: req.query.muscleGroup as any,
        name: req.query.name as string,
        userId: req.userId!,
      };

      const exercises = await this.service.getAllExercises(filters);

      res.json({
        success: true,
        data: exercises,
        count: exercises.length,
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const exercise = await this.service.getExerciseById(id);

      res.json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (req.body.isGlobal && !req.userIsAdmin) {
        throw new ForbiddenError("Brak uprawnień do tworzenia globalnych ćwiczeń");
      }

      const exercise = await this.service.createExercise({
        ...req.body,
        userId: req.userId,
      });

      res.status(201).json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const exercise = await this.service.updateExercise(
        id,
        req.body,
        req.userId!,
        req.userIsAdmin
      );

      res.json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await this.service.deleteExercise(id, req.userId!, req.userIsAdmin);

      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }
}
