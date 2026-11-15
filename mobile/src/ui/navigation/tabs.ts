import type { IconName } from "../icons";

export type TabId = "trainings" | "exercises" | "stats" | "plans" | "settings";

export const TAB_IDS: readonly TabId[] = ["trainings", "exercises", "stats", "plans", "settings"];

export function isTabId(value: string | undefined): value is TabId {
  return (TAB_IDS as readonly (string | undefined)[]).includes(value);
}

/** Bottom bar: first three tabs (labels are accessibility-only, as in the PWA). */
export const BAR_TABS: readonly { id: TabId; label: string; icon: IconName }[] = [
  { id: "trainings", label: "Treningi", icon: "home" },
  { id: "exercises", label: "Ćwiczenia", icon: "workouts" },
  { id: "stats", label: "Statystyki", icon: "stats" },
];

export const DRAWER_ITEMS: readonly { id: TabId; label: string; icon: IconName }[] = [
  { id: "trainings", label: "Historia treningów", icon: "home" },
  { id: "exercises", label: "Ćwiczenia", icon: "workouts" },
  { id: "stats", label: "Statystyki", icon: "stats" },
  { id: "plans", label: "Plany treningowe", icon: "plans" },
  { id: "settings", label: "Ustawienia", icon: "settings" },
];
