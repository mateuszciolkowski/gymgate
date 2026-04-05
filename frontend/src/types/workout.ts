export type WorkoutStatus = "DRAFT" | "COMPLETED";

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "ABS"
  | "FOREARMS"
  | "OBLIQUES"
  | "LOWER_BACK"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "ADDUCTORS"
  | "HIP_FLEXORS"
  | "TRAPS"
  | "LATS"
  | "MIDDLE_BACK"
  | "NECK"
  | "FULL_BODY";

export interface WorkoutSet {
  id: string;
  itemId: string;
  setNumber: number;
  weight: string; // Decimal from backend comes as string
  repetitions: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutItem {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderInWorkout: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  exercise: {
    id: string;
    name: string;
    muscleGroups: string[];
    description?: string | null;
    photos?: Array<{
      id: string;
      photoStage: string;
      photoUrl: string;
    }>;
  };
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  userId: string;
  workoutDate: string;
  status: WorkoutStatus;
  workoutName?: string | null;
  gymName?: string | null;
  location?: string | null;
  workoutNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: WorkoutItem[];
}

export interface ExerciseStats {
  id: string;
  userId: string;
  exerciseId: string;
  maxWeight: string; // Decimal from backend comes as string
  maxWeightReps: number;
  maxWeightDate: string;
  lastWeight: string; // Decimal from backend comes as string
  lastReps: number;
  lastWorkoutDate: string;
  totalWorkouts: number;
  exercise?: {
    id: string;
    name: string;
    muscleGroups: string[];
  };
}

export interface StatsOverview {
  workoutsLastMonth: number;
  workoutsLastYear: number;
  totalSets: number;
  totalVolume: number;
}

export type StatsProgressMetric = "maxSetWeight" | "volume";

export interface ExerciseProgressPoint {
  workoutId: string;
  workoutDate: string;
  maxSetWeight: number;
  repetitionsAtMaxSet: number;
  volume: number;
  value: number;
}

export interface ExerciseProgression {
  exerciseId: string;
  metric: StatsProgressMetric;
  points: ExerciseProgressPoint[];
}

export interface CreateWorkoutDto {
  workoutDate?: string;
  workoutName?: string;
  gymName?: string;
  location?: string;
  workoutNotes?: string;
}

export interface UpdateWorkoutDto {
  workoutDate?: string;
  status?: WorkoutStatus;
  workoutName?: string;
  gymName?: string;
  location?: string;
  workoutNotes?: string;
}

export interface AddExerciseToWorkoutDto {
  exerciseId: string;
  orderInWorkout?: number;
  notes?: string;
}

export interface CreateWorkoutSetDto {
  weight: number;
  repetitions: number;
  setNumber?: number;
}

export interface UpdateWorkoutSetDto {
  weight?: number;
  repetitions?: number;
}
