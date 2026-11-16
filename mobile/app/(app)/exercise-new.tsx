import { useLocalSearchParams } from "expo-router";
import { ExerciseFormScreen } from "@/features/exercises";

/** Create-exercise form. With `workoutId` (opened from the picker) the new exercise is also added to that workout. */
export default function ExerciseNew() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  return <ExerciseFormScreen workoutId={workoutId} />;
}
