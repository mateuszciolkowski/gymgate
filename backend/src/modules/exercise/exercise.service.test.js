import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseService } from './exercise.service.js';
import { ExerciseRepository } from './exercise.repository.js';
vi.mock('./exercise.repository.js', () => {
    return {
        ExerciseRepository: vi.fn(function () {
            return {
                findAll: vi.fn(),
                findById: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                findByMuscleGroups: vi.fn(),
            };
        }),
    };
});
describe('ExerciseService', () => {
    let service;
    let mockRepo;
    beforeEach(() => {
        vi.clearAllMocks();
        service = new ExerciseService();
        mockRepo = service.repository;
    });
    describe('getExerciseById', () => {
        it('powinien zwrócić ćwiczenie, gdy zostanie znalezione', async () => {
            const mockExercise = { id: '1', name: 'Deadlift' };
            mockRepo.findById.mockResolvedValue(mockExercise);
            const result = await service.getExerciseById('1');
            expect(result).toEqual(mockExercise);
            expect(mockRepo.findById).toHaveBeenCalledWith('1');
        });
        it('powinien rzucić błąd "Exercise not found", gdy nie ma ćwiczenia', async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(service.getExerciseById('non-existent'))
                .rejects
                .toThrow('Exercise not found');
        });
    });
});
//# sourceMappingURL=exercise.service.test.js.map