import { ExerciseRepository } from './exercise.repository.js';
export class ExerciseService {
    repository;
    constructor() {
        this.repository = new ExerciseRepository();
    }
    async getAllExercises(filters) {
        return this.repository.findAll(filters);
    }
    async getExerciseById(id) {
        const exercise = await this.repository.findById(id);
        if (!exercise) {
            throw new Error('Exercise not found');
        }
        return exercise;
    }
    async createExercise(data) {
        return this.repository.create(data);
    }
    async updateExercise(id, data) {
        await this.getExerciseById(id);
        return this.repository.update(id, data);
    }
    async deleteExercise(id) {
        await this.getExerciseById(id);
        return this.repository.delete(id);
    }
    async getExercisesByMuscleGroups(muscleGroups) {
        return this.repository.findByMuscleGroups(muscleGroups);
    }
}
//# sourceMappingURL=exercise.service.js.map