import { ExerciseService } from "./exercise.service.js";
export class ExerciseController {
    service;
    constructor() {
        this.service = new ExerciseService();
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }
    async getAll(req, res) {
        try {
            const filters = {
                muscleGroup: req.query.muscleGroup,
                name: req.query.name,
                creatorUserId: req.query.creatorUserId,
            };
            const exercises = await this.service.getAllExercises(filters);
            res.json({
                success: true,
                data: exercises,
                count: exercises.length,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            });
        }
    }
    async getById(req, res) {
        try {
            const { id } = req.params;
            const exercise = await this.service.getExerciseById(id);
            res.json({
                success: true,
                data: exercise,
            });
        }
        catch (error) {
            const statusCode = error instanceof Error && error.message === "Exercise not found"
                ? 404
                : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            });
        }
    }
    async create(req, res) {
        try {
            const exercise = await this.service.createExercise({
                ...req.body,
                userId: req.userId,
            });
            res.status(201).json({
                success: true,
                data: exercise,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : "Bad request",
            });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const exercise = await this.service.updateExercise(id, req.body, req.userId);
            res.json({
                success: true,
                data: exercise,
            });
        }
        catch (error) {
            const statusCode = error instanceof Error && error.message === "Exercise not found"
                ? 404
                : 400;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : "Bad request",
            });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            await this.service.deleteExercise(id, req.userId);
            res.status(204).send();
        }
        catch (error) {
            const statusCode = error instanceof Error && error.message === "Exercise not found"
                ? 404
                : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            });
        }
    }
}
//# sourceMappingURL=exercise.controller.js.map