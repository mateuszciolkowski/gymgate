import { memo, useEffect, useMemo, useState } from "react";
import { ScreenContainer, ScreenHeader } from "@/components/ui";
import { useData, useStatsData } from "@/contexts/DataContext";
import type { ExerciseStats } from "@/types";
import { StatsProgressChart } from "./StatsProgressChart";

interface StatsExerciseDetailScreenProps {
  exerciseId: string;
  onBack: () => void;
}

const getExerciseStat = (stats: ExerciseStats[], exerciseId: string) =>
  stats.find((entry) => entry.exerciseId === exerciseId) ?? null;

export const StatsExerciseDetailScreen = memo(function StatsExerciseDetailScreen({
  exerciseId,
  onBack,
}: StatsExerciseDetailScreenProps) {
  const { stats, getExerciseProgression } = useStatsData();
  const { workouts } = useData();
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  const [progression, setProgression] = useState<
    Awaited<ReturnType<typeof getExerciseProgression>> | null
  >(null);
  const exerciseStat = useMemo(() => getExerciseStat(stats, exerciseId), [stats, exerciseId]);
  const setHistoryByWorkoutId = useMemo(() => {
    const map = new Map<string, string>();

    workouts.forEach((workout) => {
      const item = workout.items.find((entry) => entry.exerciseId === exerciseId);
      if (!item || item.sets.length === 0) return;

      const setSummary = [...item.sets]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((set) => `${set.weight} kg × ${set.repetitions}`)
        .join(", ");

      map.set(workout.id, setSummary);
    });

    return map;
  }, [workouts, exerciseId]);
  const sortedRecentPoints = useMemo(() => {
    const points = progression?.points ?? [];
    const newestFirst = [...points].sort(
      (a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime(),
    );
    const recent = newestFirst.slice(0, 8);
    return dateSort === "asc"
      ? recent.sort(
          (a, b) =>
            new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime(),
        )
      : recent;
  }, [progression, dateSort]);

  useEffect(() => {
    getExerciseProgression(exerciseId, "maxSetWeight")
      .then(setProgression)
      .catch(() => setProgression(null));
  }, [exerciseId, getExerciseProgression]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={exerciseStat?.exercise?.name ?? "Szczegóły statystyk"}
        subtitle="Maxy i historia wyników"
        onBack={onBack}
      />

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Maksymalny ciężar</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {exerciseStat?.maxWeight ?? "0"} kg
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Powtórzenia przy PR</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {exerciseStat?.maxWeightReps ?? 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Liczba treningów</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {exerciseStat?.totalWorkouts ?? 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Ostatni wynik</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {exerciseStat?.lastWeight ?? "0"} kg × {exerciseStat?.lastReps ?? 0}
            </p>
          </div>
        </div>

        <StatsProgressChart
          points={progression?.points ?? []}
          label="Ciężar podnoszony w czasie"
          height={220}
          ySuffix=" kg"
        />

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Ostatnie wyniki
            </p>
            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setDateSort("desc")}
                className={`px-2 py-1 text-xs transition-colors ${
                  dateSort === "desc"
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                }`}
              >
                Data ↓
              </button>
              <button
                type="button"
                onClick={() => setDateSort("asc")}
                className={`px-2 py-1 text-xs transition-colors border-l border-gray-300 dark:border-gray-700 ${
                  dateSort === "asc"
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                }`}
              >
                Data ↑
              </button>
            </div>
          </div>
          {(progression?.points ?? []).length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/70">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300">
                      Data
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-300">
                      Serie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecentPoints.map((point) => (
                    <tr
                      key={point.workoutId}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {new Date(point.workoutDate).toLocaleDateString("pl-PL")}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {setHistoryByWorkoutId.get(point.workoutId) ??
                          `${point.maxSetWeight} kg × ${point.repetitionsAtMaxSet}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-500">
              Brak historii dla tego ćwiczenia.
            </p>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
});
