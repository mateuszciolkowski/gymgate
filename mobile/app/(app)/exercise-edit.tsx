import { useLocalSearchParams } from "expo-router";
import { ExerciseFormScreen } from "@/features/exercises";

export default function ExerciseEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseFormScreen editId={id} />;
}
