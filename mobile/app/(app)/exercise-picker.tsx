import { useLocalSearchParams } from "expo-router";
import { ExercisePickerSheet } from "@/features/exercises";

export default function ExercisePicker() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return <ExercisePickerSheet workoutId={workoutId} />;
}
