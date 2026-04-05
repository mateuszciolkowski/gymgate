import { memo, useMemo } from "react";
import { ScreenContainer, ScreenHeader } from "@/components/ui";
import { ChartIcon } from "@/components/icons";
import { useStatsData } from "@/contexts/DataContext";

interface StatsScreenProps {
  onOpenExerciseDetails: (exerciseId: string) => void;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

const StatCard = memo(function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-5 border border-gray-300 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 dark:text-gray-400 text-sm">{label}</span>
        {icon && <span className="text-emerald-600 dark:text-emerald-500">{icon}</span>}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
});

export const StatsScreen = memo(function StatsScreen({
  onOpenExerciseDetails,
}: StatsScreenProps) {
  const { stats, overview } = useStatsData();
  const sortedStats = useMemo(
    () => [...stats].sort((a, b) => Number(b.maxWeight) - Number(a.maxWeight)),
    [stats],
  );

  return (
    <ScreenContainer>
      <ScreenHeader title="Statystyki" subtitle="Śledź swoje postępy" />

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Treningi (miesiąc)"
            value={overview?.workoutsLastMonth ?? 0}
            icon={<ChartIcon className="w-5 h-5" />}
          />
          <StatCard label="Treningi (rok)" value={overview?.workoutsLastYear ?? 0} />
          <StatCard label="Łączna liczba serii" value={overview?.totalSets ?? 0} />
          <StatCard
            label="Objętość (kg)"
            value={(overview?.totalVolume ?? 0).toLocaleString("pl-PL")}
          />
        </div>

        <div className="bg-accent-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
          Wykresy są dostępne po wejściu w szczegóły konkretnego ćwiczenia.
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Rekordy osobiste
          </h2>
          <div className="space-y-3">
            {sortedStats.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onOpenExerciseDetails(entry.exerciseId)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <p className="text-gray-900 dark:text-white">
                    {entry.exercise?.name ?? "Ćwiczenie"}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center tabular-nums">
                    {Number(entry.maxWeight).toLocaleString("pl-PL")}
                    <span className="ml-1 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      kg
                    </span>
                  </p>
                  <span className="text-sm text-emerald-600 dark:text-emerald-500">
                    Szczegóły
                  </span>
                </div>
              </button>
            ))}
            {sortedStats.length === 0 && (
              <div className="bg-accent-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-500">
                Brak statystyk. Zakończ pierwszy trening, aby zobaczyć rekordy.
              </div>
            )}
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
});
