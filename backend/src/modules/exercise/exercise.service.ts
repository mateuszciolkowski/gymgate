import { ExerciseRepository } from './exercise.repository.js';
import type { CreateExerciseDto, UpdateExerciseDto, FilterExercisesDto } from './exercise.schema.js';

export class ExerciseService {
  private repository: ExerciseRepository;

  constructor() {
    this.repository = new ExerciseRepository();
  }

  async getAllExercises(filters?: FilterExercisesDto) {
    return this.repository.findAll(filters);
  }

  async getExerciseById(id: string) {
    const exercise = await this.repository.findById(id);
    
    if (!exercise) {
      throw new Error('Exercise not found');
    }
    
    return exercise;
  }

  async createExercise(data: CreateExerciseDto) {
    return this.repository.create(data);
  }

  async updateExercise(id: string, data: UpdateExerciseDto, userId: string) {
    const exercise = await this.getExerciseById(id);
    
    if (exercise.creatorUserId !== userId) {
      throw new Error('Unauthorized: You can only edit your own exercises');
    }
    
    return this.repository.update(id, data);
  }

  async deleteExercise(id: string, userId: string) {
    const exercise = await this.getExerciseById(id);
    
    if (exercise.creatorUserId !== userId) {
      throw new Error('Unauthorized: You can only delete your own exercises');
    }
    
    return this.repository.delete(id);
  }

  async getExercisesByMuscleGroups(muscleGroups: string[]) {
    return this.repository.findByMuscleGroups(muscleGroups as any);
  }
}
