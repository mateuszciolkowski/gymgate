import type { SyncOperation } from "@/utils/localStore";
import type {
  Workout,
  ExerciseStats,
  ExerciseProgression,
  StatsOverview,
  StatsProgressMetric,
  WorkoutPlan,
} from "@/types";
import type { Exercise } from "@/hooks/useExercises";

export class WorkoutNotFoundError extends Error {
  constructor(message = "Workout not found") {
    super(message);
    this.name = "WorkoutNotFoundError";
  }
}

export interface DataContextType {
  // Dane
  workouts: Workout[];
  exercises: Exercise[];
  stats: ExerciseStats[];
  statsOverview: StatsOverview | null;
  activeWorkoutId: string | null;
  plans: WorkoutPlan[];

  // Stan
  isLoading: boolean;
  isOnline: boolean;
  lastSync: number;

  // Akcje - Workouts
  createWorkout: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate?: string;
    workoutPlanId?: string;
  }) => Promise<Workout>;
  updateWorkout: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkout: (id: string) => Workout | undefined;

  // Akcje - Exercises
  createExercise: (data: {
    name: string;
    muscleGroups: string[];
    description?: string;
  }) => Promise<Exercise>;
  updateExercise: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;

  // Akcje - Workout Items & Sets
  addExerciseToWorkout: (
    workoutId: string,
    exerciseId: string,
  ) => Promise<void>;
  removeExerciseFromWorkout: (
    workoutId: string,
    itemId: string,
  ) => Promise<void>;
  updateWorkoutItem: (
    workoutId: string,
    itemId: string,
    data: { notes?: string | null },
  ) => Promise<void>;
  addSet: (
    workoutId: string,
    itemId: string,
    data: { weight: number; repetitions: number; setNumber: number },
  ) => Promise<void>;
  updateSet: (
    workoutId: string,
    setId: string,
    data: { weight?: number; repetitions?: number },
  ) => Promise<void>;
  deleteSet: (
    workoutId: string,
    itemId: string,
    setId: string,
  ) => Promise<void>;
  completeWorkout: (id: string, durationSeconds?: number) => Promise<void>;

  // Akcje - Plans
  createPlan: (data: { name: string; exerciseIds: string[]; isPublic: boolean }) => Promise<WorkoutPlan>;
  updatePlan: (id: string, data: { name?: string; exerciseIds?: string[]; isPublic?: boolean }) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  duplicatePlan: (id: string) => Promise<WorkoutPlan>;
  favoritePlan: (id: string) => Promise<void>;
  unfavoritePlan: (id: string) => Promise<void>;

  // Akcje - Plan integration
  skipPlanExercise: (workoutId: string, exerciseId: string) => Promise<void>;

  // Sync
  syncNow: () => Promise<void>;
  refreshWorkout: (id: string) => Promise<void>;
  resetLocalCache: () => Promise<void>;
  failedSyncOperations: SyncOperation[];
  dismissSyncFailures: () => void;
  getExerciseProgression: (
    exerciseId: string,
    metric?: StatsProgressMetric,
  ) => Promise<ExerciseProgression>;
}
