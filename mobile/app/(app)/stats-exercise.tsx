import { useLocalSearchParams } from "expo-router";
import { StatsExerciseScreen } from "@/features/stats";

export default function StatsExercise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StatsExerciseScreen exerciseId={id} />;
}
