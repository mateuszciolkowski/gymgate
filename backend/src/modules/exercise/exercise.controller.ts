import type { Request, Response } from 'express';
import { ExerciseService } from './exercise.service.js';

export class ExerciseController {
  private service: ExerciseService;

  constructor() {
    this.service = new ExerciseService();
    
    // ✅ Zbinduj metody do kontekstu klasy
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: Request, res: Response) {
    try {
      const filters = {
        muscleGroup: req.query.muscleGroup as any,
        name: req.query.name as string,
        creatorUserId: req.query.creatorUserId as string,
      };

      const exercises = await this.service.getAllExercises(filters);
      
      res.json({
        success: true,
        data: exercises,
        count: exercises.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
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
      const statusCode = error instanceof Error && error.message === 'Exercise not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const exercise = await this.service.createExercise(req.body);
      
      res.status(201).json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bad request',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const exercise = await this.service.updateExercise(id, req.body);
      
      res.json({
        success: true,
        data: exercise,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Exercise not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bad request',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await this.service.deleteExercise(id);
      
      res.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Exercise not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}
