export type TabType = "trainings" | "exercises" | "stats" | "plans" | "menu";
export type Screen =
  | TabType
  | "add-exercise"
  | "edit-exercise"
  | "workout-detail"
  | "stats-exercise-detail"
  | "plan-form";

export interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
