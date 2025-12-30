export type TabType = "trainings" | "exercises" | "stats" | "menu";
export type Screen =
  | TabType
  | "add-exercise"
  | "edit-exercise"
  | "workout-detail";

export interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
