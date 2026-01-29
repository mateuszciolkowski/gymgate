import { useState, useMemo } from "react";
import { FilterChip } from "../ui";
import { EditIcon, TrashIcon } from "../icons";
import { useExercises, type Exercise } from "../../hooks/useExercises";
import { useAllUserStats, type ExerciseStats } from "@/hooks";
import { MUSCLE_GROUPS } from "../../constants";
import { useAuth } from "@/contexts/AuthContext";

interface ExerciseListProps {
  mode: "select" | "manage";
  onSelectExercise?: (exerciseId: string) => void;
  onEditExercise?: (exercise: Exercise) => void;
  onDeleteExercise?: (id: string, name: string) => void;
  excludeExerciseIds?: string[];
}

export function ExerciseList({
  mode,
  onSelectExercise,
  onEditExercise,
  onDeleteExercise,
  excludeExerciseIds = [],
}: ExerciseListProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    string | undefined
  >(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlyPerformed, setShowOnlyPerformed] = useState(false);
  const [showOnlyMyExercises, setShowOnlyMyExercises] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { exercises, loading, error } = useExercises(
    selectedMuscleGroup ? { muscleGroup: selectedMuscleGroup } : undefined
  );
  const { stats: allStats } = useAllUserStats();
  const { user } = useAuth();

  const filteredAndSortedExercises = useMemo(() => {
    let filtered = [...exercises];

    if (user) {
      filtered = filtered.filter(
        (ex) => ex.creator.id === "1" || String(ex.creator.id) === String(user.id)
      );
    }

    if (mode === "select" && excludeExerciseIds.length > 0) {
      filtered = filtered.filter((ex) => !excludeExerciseIds.includes(ex.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.muscleGroups.some((mg) => mg.toLowerCase().includes(query))
      );
    }

    if (showOnlyMyExercises && user) {
      filtered = filtered.filter(
        (ex) => String(ex.creator.id) === String(user.id)
      );
    }

    if (showOnlyPerformed) {
      const performedIds = new Set(allStats.map((s) => s.exerciseId));
      filtered = filtered.filter((ex) => performedIds.has(ex.id));

      filtered.sort((a, b) => {
        const aPerformed = performedIds.has(a.id);
        const bPerformed = performedIds.has(b.id);
        if (aPerformed && !bPerformed) return -1;
        if (!aPerformed && bPerformed) return 1;
        return 0;
      });
    }

    filtered.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name, "pl");
      } else {
        return b.name.localeCompare(a.name, "pl");
      }
    });

    return filtered;
  }, [
    exercises,
    excludeExerciseIds,
    searchQuery,
    showOnlyMyExercises,
    user,
    showOnlyPerformed,
    allStats,
    sortOrder,
    mode,
  ]);

  const toggleFilter = (muscleGroup: string) => {
    setSelectedMuscleGroup((prev) =>
      prev === muscleGroup ? undefined : muscleGroup
    );
  };

  const clearFilters = () => {
    setSelectedMuscleGroup(undefined);
  };

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-11 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
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
              ? "bg-purple-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {showOnlyPerformed ? "✓ Wykonywane" : "Wykonywane"}
        </button>
        <button
          onClick={() => setShowOnlyMyExercises(!showOnlyMyExercises)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showOnlyMyExercises
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {showOnlyMyExercises ? "✓ Moje" : "Moje"}
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {selectedMuscleGroup && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium"
            >
              ✕ Wyczyść partie
            </button>
          </div>
        )}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 pb-2 min-w-min">
            {MUSCLE_GROUPS.map((group) => (
              <FilterChip
                key={group.value}
                label={group.label}
                isActive={selectedMuscleGroup === group.value}
                onClick={() => toggleFilter(group.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 pb-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ładowanie...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : filteredAndSortedExercises.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {mode === "select" && excludeExerciseIds.length > 0
              ? "Wszystkie ćwiczenia zostały już dodane do treningu"
              : "Nie znaleziono ćwiczeń"}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedExercises.map((exercise) => (
              <ExerciseItem
                key={exercise.id}
                exercise={exercise}
                mode={mode}
                stats={allStats.find((s) => s.exerciseId === exercise.id)}
                onSelect={onSelectExercise}
                onEdit={onEditExercise}
                onDelete={onDeleteExercise}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExerciseItemProps {
  exercise: Exercise;
  mode: "select" | "manage";
  stats?: ExerciseStats;
  onSelect?: (exerciseId: string) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (id: string, name: string) => void;
}

function ExerciseItem({
  exercise,
  mode,
  stats,
  onSelect,
  onEdit,
  onDelete,
}: ExerciseItemProps) {
  const { user } = useAuth();

  const canEdit = user && String(exercise.creator.id) === String(user.id);

  const handleClick = () => {
    if (mode === "select" && onSelect) {
      onSelect(exercise.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors ${
        mode === "select"
          ? "cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
          : "hover:border-emerald-300 dark:hover:border-emerald-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {exercise.name}
            </h3>
            {mode === "select" && (
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold ml-2">
                +
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.muscleGroups.map((mg) => {
              const group = MUSCLE_GROUPS.find((g) => g.value === mg);
              return (
                <span
                  key={mg}
                  className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
                >
                  {group?.label || mg}
                </span>
              );
            })}
          </div>

          {exercise.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {exercise.description}
            </p>
          )}

          {stats && (
            <div className="flex gap-4 text-sm mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <span className="text-purple-700 dark:text-purple-300">
                Ostatnio:{" "}
                <strong>
                  {stats.lastWeight} kg × {stats.lastReps}
                </strong>
              </span>
              <span className="text-purple-700 dark:text-purple-300">
                Rekord:{" "}
                <strong>
                  {stats.maxWeight} kg × {stats.maxWeightReps}
                </strong>
              </span>
            </div>
          )}

          {exercise.creator.id !== "1" && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Dodane przez: {exercise.creator.firstName}{" "}
              {exercise.creator.lastName}
            </p>
          )}
        </div>

        {mode === "manage" && canEdit && (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit?.(exercise)}
              className="p-2 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Edytuj"
            >
              <EditIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete?.(exercise.id, exercise.name)}
              className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Usuń"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
