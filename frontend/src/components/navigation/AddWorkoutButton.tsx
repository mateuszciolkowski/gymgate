import { memo } from "react";
import { PlusIcon } from "@/components/icons";

interface AddWorkoutButtonProps {
  onClick: () => void;
  isActive?: boolean;
  hasActiveWorkout?: boolean;
  className?: string;
}

export const AddWorkoutButton = memo(function AddWorkoutButton({
  onClick,
  isActive = false,
  hasActiveWorkout = false,
  className = "",
}: AddWorkoutButtonProps) {
  const baseClasses =
    "flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full -mt-8 sm:-mt-10 border-4 transition-colors touch-manipulation shadow-lg";

  const inactiveClasses =
    "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white";

  const activeClasses =
    "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/40";

  // Gdy jest aktywny trening ale nie jesteśmy w jego widoku - pomarańczowy pulsujący
  const hasActiveButNotViewingClasses =
    "border-orange-500 bg-orange-500 text-white shadow-orange-500/40 animate-pulse";

  const getButtonClasses = () => {
    if (isActive) return activeClasses;
    if (hasActiveWorkout) return hasActiveButNotViewingClasses;
    return inactiveClasses;
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${getButtonClasses()} ${className}`.trim()}
      aria-label={hasActiveWorkout ? "Kontynuuj trening" : "Rozpocznij trening"}
    >
      {hasActiveWorkout && !isActive ? (
        // Ikona "play" gdy jest aktywny trening
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="w-8 h-8 sm:w-10 sm:h-10"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        <PlusIcon className="w-8 h-8 sm:w-10 sm:h-10" />
      )}
    </button>
  );
});
