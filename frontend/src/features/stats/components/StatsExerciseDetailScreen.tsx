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
    { label: "Maks. ciężar", value: `${exerciseStat?.maxWeight ?? "0"} kg` },
    { label: "Powt. przy PR", value: String(exerciseStat?.maxWeightReps ?? 0) },
    { label: "Treningi", value: String(exerciseStat?.totalWorkouts ?? 0) },
    { label: "Ostatnio", value: `${exerciseStat?.lastWeight ?? "0"} kg × ${exerciseStat?.lastReps ?? 0}` },
  ];

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] flex-shrink-0 cursor-pointer"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h2
            className="font-barlow font-black"
            style={{ fontSize: 22, letterSpacing: "-0.02em", color: "var(--gg-text)", lineHeight: 1.2 }}
          >
            {exerciseStat?.exercise?.name ?? "Szczegóły statystyk"}
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            Maxy i historia wyników
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-[18px]"
            style={{
              padding: "14px 16px",
              background: "var(--gg-surface)",
              border: "1.5px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--gg-text-muted)" }}>
              {card.label}
            </p>
            <p className="font-barlow-condensed font-black text-[20px]" style={{ color: "var(--gg-text)" }}>
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
          height={200}
          ySuffix=" kg"
        />
      </div>

      {/* History table */}
      <div
        className="rounded-[20px] mb-6"
        style={{
          background: "var(--gg-surface)",
          border: "1.5px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--gg-border)" }}
        >
          <p className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
            Ostatnie wyniki
          </p>
          <div className="flex rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--gg-border)" }}>
            {(["desc", "asc"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setDateSort(dir)}
                className="px-3 py-1 text-[11px] font-semibold border-none cursor-pointer transition-all"
                style={{
                  background: dateSort === dir ? "var(--gg-a1)" : "transparent",
                  color: dateSort === dir ? "#fff" : "var(--gg-text-muted)",
                }}
              >
                {dir === "desc" ? "Data ↓" : "Data ↑"}
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
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--gg-border)",
              }}
            >
              <span className="text-[12px]" style={{ color: "var(--gg-text-sub)" }}>
                {new Date(point.workoutDate).toLocaleDateString("pl-PL")}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--gg-text)" }}>
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
