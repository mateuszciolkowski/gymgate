export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  description?: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  photos?: Array<{
    id: string;
    photoStage: string;
    photoUrl: string;
  }>;
}
