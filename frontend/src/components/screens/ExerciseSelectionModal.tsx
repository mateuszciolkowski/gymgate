import { useState, useMemo } from "react";
import { useExercises, useExerciseStats, useAllUserStats } from "@/hooks";
import type { MuscleGroup } from "@/types";

interface ExerciseSelectionModalProps {
  onClose: () => void;
  onSelectExercise: (exerciseId: string) => void;
  existingExerciseIds: string[];
}

export function ExerciseSelectionModal({
  onClose,
  onSelectExercise,
  existingExerciseIds,
}: ExerciseSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    MuscleGroup | "ALL"
  >("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlyPerformed, setShowOnlyPerformed] = useState(false);

  const { exercises, loading } = useExercises({
    muscleGroup:
      selectedMuscleGroup === "ALL" ? undefined : selectedMuscleGroup,
    name: searchQuery,
  });

  const { stats: allStats } = useAllUserStats();

  const muscleGroups: Array<MuscleGroup | "ALL"> = [
    "ALL",
    "CHEST",
    "BACK",
    "LEGS",
    "SHOULDERS",
    "BICEPS",
    "TRICEPS",
    "ABS",
  ];

  const muscleGroupLabels: Partial<Record<MuscleGroup | "ALL", string>> = {
    ALL: "Wszystkie",
    CHEST: "Klatka",
    BACK: "Plecy",
    LEGS: "Nogi",
    SHOULDERS: "Barki",
    BICEPS: "Biceps",
    TRICEPS: "Triceps",
    ABS: "Brzuch",
  };

  const availableExercises = useMemo(() => {
    let filtered = exercises.filter(
      (ex) => !existingExerciseIds.includes(ex.id)
    );

    // Filtruj tylko wykonywane
    if (showOnlyPerformed) {
      const performedIds = new Set(allStats.map((s) => s.exerciseId));
      filtered = filtered.filter((ex) => performedIds.has(ex.id));
    }

    // Sortuj
    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name, "pl");
      } else {
        return b.name.localeCompare(a.name, "pl");
      }
    });

    return filtered;
  }, [exercises, existingExerciseIds, showOnlyPerformed, allStats, sortOrder]);

  const handleSelectExercise = (exerciseId: string) => {
    onSelectExercise(exerciseId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Wybierz ćwiczenie</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>

        {/* Sort and Filter Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
            >
              {sortOrder === "asc" ? "A→Z" : "Z→A"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    sortOrder === "asc"
                      ? "M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                      : "M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                  }
                />
              </svg>
            </button>
            <button
              onClick={() => setShowOnlyPerformed(!showOnlyPerformed)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showOnlyPerformed
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {showOnlyPerformed ? "✓ Wykonywane" : "Wszystkie"}
            </button>
          </div>
        </div>

        {/* Muscle Group Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {muscleGroups.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedMuscleGroup(group)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedMuscleGroup === group
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {muscleGroupLabels[group]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Ładowanie ćwiczeń...
            </div>
          ) : availableExercises.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {existingExerciseIds.length > 0 &&
              exercises.length === existingExerciseIds.length
                ? "Wszystkie ćwiczenia zostały już dodane do treningu"
                : "Nie znaleziono ćwiczeń"}
            </div>
          ) : (
            <div className="space-y-2">
              {availableExercises.map((exercise) => (
                <ExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  onSelect={handleSelectExercise}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExerciseItemProps {
  exercise: {
    id: string;
    name: string;
    muscleGroups: string[]; // API returns string[]
    description?: string;
  };
  onSelect: (exerciseId: string) => void;
}

function ExerciseItem({ exercise, onSelect }: ExerciseItemProps) {
  const { stats } = useExerciseStats(exercise.id);

  return (
    <button
      onClick={() => onSelect(exercise.id)}
      className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{exercise.name}</h3>
        <span className="text-blue-600 dark:text-blue-400 text-sm">+</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-2">
        {exercise.muscleGroups.map((group) => (
          <span
            key={group}
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
          >
            {group}
          </span>
        ))}
      </div>

      {exercise.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {exercise.description}
        </p>
      )}

      {stats && (
        <div className="flex gap-4 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
          <span>
            Ostatnio: {stats.lastWeight} kg × {stats.lastReps}
          </span>
          <span>
            Rekord: {stats.maxWeight} kg × {stats.maxWeightReps}
          </span>
        </div>
      )}
    </button>
  );
}
