import { memo } from "react";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const FilterChip = memo(function FilterChip({
  label,
  isActive,
  onClick,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
        ${
          isActive
            ? "bg-emerald-600 text-white shadow-md"
            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }
      `}
    >
      {label}
    </button>
  );
});
