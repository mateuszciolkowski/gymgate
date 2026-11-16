import { useLocalSearchParams } from "expo-router";
import { ExerciseFormScreen } from "@/features/exercises";

/** Create-exercise form. With `workoutId` / `planKey` (opened from a picker) the new exercise is also added to that workout / plan draft. */
export default function ExerciseNew() {
  const { workoutId, planKey } = useLocalSearchParams<{ workoutId?: string; planKey?: string }>();
  return <ExerciseFormScreen workoutId={workoutId} planKey={planKey} />;
}
