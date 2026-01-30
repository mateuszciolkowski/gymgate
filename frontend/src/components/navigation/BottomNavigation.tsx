import { memo, useCallback } from "react";
import type { TabType } from "@/types";
import {
  ArchiveIcon,
  DumbbellIcon,
  ChartIcon,
  MenuIcon,
} from "@/components/icons";
import { NavButton } from "./NavButton";
import { AddWorkoutButton } from "./AddWorkoutButton";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddWorkout: () => void;
  isWorkoutDetail?: boolean;
  hasActiveWorkout?: boolean;
}

const navItems = [
  { id: "trainings" as TabType, label: "Treningi", icon: ArchiveIcon },
  { id: "exercises" as TabType, label: "Ćwiczenia", icon: DumbbellIcon },
  { id: "stats" as TabType, label: "Statystyki", icon: ChartIcon },
  { id: "menu" as TabType, label: "Menu", icon: MenuIcon },
];

export const BottomNavigation = memo(function BottomNavigation({
  activeTab,
  onTabChange,
  onAddWorkout,
  isWorkoutDetail = false,
  hasActiveWorkout = false,
}: BottomNavigationProps) {
  const handleTabChange = useCallback(
    (tab: TabType) => {
      onTabChange(tab);
    },
    [onTabChange],
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-800 px-2 py-4 pb-6 z-50"
      role="navigation"
      aria-label="Nawigacja główna"
    >
      <div className="grid grid-cols-5 items-end justify-items-center max-w-xl mx-auto gap-0">
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={!isWorkoutDetail && activeTab === item.id}
            onClick={handleTabChange}
          />
        ))}

        <div className="flex justify-center">
          <AddWorkoutButton
            onClick={onAddWorkout}
            isActive={isWorkoutDetail}
            hasActiveWorkout={hasActiveWorkout}
            className="justify-self-center"
          />
        </div>

        {navItems.slice(2).map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={!isWorkoutDetail && activeTab === item.id}
            onClick={handleTabChange}
          />
        ))}
      </div>
    </nav>
  );
});
