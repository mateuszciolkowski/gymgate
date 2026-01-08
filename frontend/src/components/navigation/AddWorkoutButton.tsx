import { memo } from "react";
import { PlusIcon } from "@/components/icons";

interface AddWorkoutButtonProps {
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export const AddWorkoutButton = memo(function AddWorkoutButton({
  onClick,
  isActive = false,
  className = "",
}: AddWorkoutButtonProps) {
  const baseClasses =
    "flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full -mt-6 border transition-colors touch-manipulation shadow-md";

  const inactiveClasses =
    "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white";

  const activeClasses =
    "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/40";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${
        isActive ? activeClasses : inactiveClasses
      } ${className}`.trim()}
      aria-label="Dodaj nowy trening"
    >
      <PlusIcon className="w-7 h-7 sm:w-8 sm:h-8" />
    </button>
  );
});
