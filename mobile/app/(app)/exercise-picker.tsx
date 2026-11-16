import { useLocalSearchParams } from "expo-router";
import { ExercisePickerSheet } from "@/features/exercises";

export default function ExercisePicker() {
  const { workoutId, planKey } = useLocalSearchParams<{ workoutId?: string; planKey?: string }>();
  return <ExercisePickerSheet workoutId={workoutId} planKey={planKey} />;
}
