import { useLocalSearchParams } from "expo-router";
import { WorkoutScreen } from "@/features/workouts";

export default function Workout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutScreen id={id} />;
}
