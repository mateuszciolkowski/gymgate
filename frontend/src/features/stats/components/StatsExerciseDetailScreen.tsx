import { memo, useEffect, useMemo, useState } from "react";
import { useData, useStatsData } from "@/contexts/data";
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
      ? recent.sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime())
      : recent;
  }, [progression, dateSort]);

  useEffect(() => {
    getExerciseProgression(exerciseId, "maxSetWeight")
      .then(setProgression)
      .catch(() => setProgression(null));
  }, [exerciseId, getExerciseProgression]);

  const statCards = [
    { label: "Maks. ciężar", value: `${exerciseStat?.maxWeight ?? "0"} kg`, highlight: true },
    { label: "Powt. przy PR", value: String(exerciseStat?.maxWeightReps ?? 0) },
    { label: "Sesje", value: String(exerciseStat?.totalWorkouts ?? 0) },
    { label: "Ostatnio", value: `${exerciseStat?.lastWeight ?? "0"} kg × ${exerciseStat?.lastReps ?? 0}` },
  ];

  return (
    <div className="px-5 pt-6 pb-28 screen-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 cursor-pointer border-none transition-colors"
          style={{ background: "var(--gg-surface2)", color: "var(--gg-text)" }}
          title="Wróć"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--gg-text-muted)" }}>
            Historia ćwiczenia
          </p>
          <h2
            className="font-barlow font-bold text-[20px] truncate leading-tight"
            style={{ color: "var(--gg-text)" }}
          >
            {exerciseStat?.exercise?.name ?? "Szczegóły ćwiczenia"}
          </h2>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-3.5 transition-all"
            style={{
              background: "var(--gg-surface)",
              border: "1px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gg-text-muted)" }}>
              {card.label}
            </p>
            <p
              className="font-barlow font-black text-[20px] leading-tight num-tabular"
              style={{ color: card.highlight ? "var(--gg-a2)" : "var(--gg-text)" }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-4">
        <StatsProgressChart
          points={progression?.points ?? []}
          label="Ciężar podnoszony w czasie"
          height={180}
          ySuffix=" kg"
        />
      </div>

      {/* History table */}
      <div
        className="rounded-2xl mb-6 overflow-hidden"
        style={{
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--gg-border)" }}
        >
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-text-muted)" }}>
            Ostatnie sesje
          </p>
          <div className="flex rounded-lg overflow-hidden p-0.5" style={{ background: "var(--gg-surface2)" }}>
            {(["desc", "asc"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setDateSort(dir)}
                className="px-2.5 py-1 text-[11px] font-bold border-none cursor-pointer rounded-md transition-all"
                style={{
                  background: dateSort === dir ? "var(--gg-a1)" : "transparent",
                  color: dateSort === dir ? "#fff" : "var(--gg-text-muted)",
                }}
              >
                {dir === "desc" ? "Najnowsze" : "Najstarsze"}
              </button>
            ))}
          </div>
        </div>

        {sortedRecentPoints.length === 0 ? (
          <p className="text-[13px] text-center py-6" style={{ color: "var(--gg-text-muted)" }}>
            Brak historii dla tego ćwiczenia.
          </p>
        ) : (
          sortedRecentPoints.map((point, i) => (
            <div
              key={point.workoutId}
              className="flex items-center justify-between px-4 py-3 text-[13px] num-tabular"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--gg-border)",
              }}
            >
              <span className="text-[12px] font-medium" style={{ color: "var(--gg-text-muted)" }}>
                {new Date(point.workoutDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="font-bold" style={{ color: "var(--gg-text)" }}>
                {setHistoryByWorkoutId.get(point.workoutId) ??
                  `${point.maxSetWeight} kg × ${point.repetitionsAtMaxSet}`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
