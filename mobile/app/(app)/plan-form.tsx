import { useLocalSearchParams } from "expo-router";
import { PlanFormScreen } from "@/features/plans";

export default function PlanForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <PlanFormScreen editId={id} />;
}
