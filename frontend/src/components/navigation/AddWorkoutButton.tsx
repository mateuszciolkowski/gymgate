import { memo } from "react";

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
  const getStyle = (): React.CSSProperties => {
    if (isActive) {
      return {
        background: "var(--gg-grad-btn)",
        border: "4px solid var(--gg-surface)",
        color: "#ffffff",
        boxShadow: "0 6px 26px var(--gg-glow)",
      };
    }
    if (hasActiveWorkout) {
      return {
        background: "linear-gradient(135deg, #f59e0b, #ea580c)",
        border: "4px solid var(--gg-surface)",
        color: "#ffffff",
        boxShadow: "0 6px 26px rgba(245, 158, 11, 0.45)",
      };
    }
    return {
      background: "var(--gg-surface2)",
      border: "4px solid var(--gg-surface)",
      color: "var(--gg-text)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
    };
  };

  return (
    <button
      onClick={onClick}
      style={getStyle()}
      className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full -mt-8 sm:-mt-10 cursor-pointer transition-all duration-200 active:scale-95 touch-manipulation ${
        hasActiveWorkout && !isActive ? "animate-pulse" : ""
      } ${className}`.trim()}
      aria-label={hasActiveWorkout ? "Kontynuuj aktywny trening" : "Rozpocznij nowy trening"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 24 24"
        className="w-8 h-8 sm:w-10 sm:h-10"
        aria-hidden="true"
      >
        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
      </svg>
    </button>
  );
});
