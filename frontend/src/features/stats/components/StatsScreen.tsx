import { memo, useMemo, useState } from "react";
import { useStatsData } from "@/contexts/data";
import type { Workout } from "@/types/workout";

interface StatsScreenProps {
  onOpenExerciseDetails: (exerciseId: string) => void;
}

function computeFirstSetWeightMap(workouts: Workout[]): Map<string, { weight: string; reps: number }> {
  const completed = workouts
    .filter((w) => w.status === "COMPLETED")
    .sort((a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime());

  const map = new Map<string, { weight: string; reps: number }>();
  for (const workout of completed) {
    for (const item of workout.items) {
      if (map.has(item.exerciseId)) continue;
      const firstSet = item.sets.find((s) => s.setNumber === 1) ?? item.sets[0];
      if (firstSet) {
        map.set(item.exerciseId, { weight: firstSet.weight, reps: firstSet.repetitions });
      }
    }
  }
  return map;
}

export const StatsScreen = memo(function StatsScreen({
  onOpenExerciseDetails,
}: StatsScreenProps) {
  const { stats, overview, workouts } = useStatsData();
  const [showCurrent, setShowCurrent] = useState(false);

  const firstSetMap = useMemo(() => computeFirstSetWeightMap(workouts), [workouts]);

  const sortedStats = useMemo(() => {
    const list = [...stats];
    if (showCurrent) {
      return list.sort((a, b) => {
        const wa = Number(firstSetMap.get(a.exerciseId)?.weight ?? 0);
        const wb = Number(firstSetMap.get(b.exerciseId)?.weight ?? 0);
        return wb - wa;
      });
    }
    return list.sort((a, b) => Number(b.maxWeight) - Number(a.maxWeight));
  }, [stats, showCurrent, firstSetMap]);

  const statCards = [
    {
      label: "Miesiąc",
      value: overview?.workoutsLastMonth ?? 0,
      sublabel: "treningów",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2s-5 6-5 11a5 5 0 0010 0C17 8 12 2 12 2z"/>
        </svg>
      ),
      highlight: true,
    },
    {
      label: "Ten rok",
      value: overview?.workoutsLastYear ?? 0,
      sublabel: "treningów",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="13" width="4" height="7" rx="1"/>
          <rect x="10" y="8" width="4" height="12" rx="1"/>
          <rect x="17" y="4" width="4" height="16" rx="1"/>
        </svg>
      ),
    },
    {
      label: "Łącznie",
      value: overview?.totalSets ?? 0,
      sublabel: "wykonanych serii",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="2" rx="1"/>
          <rect x="3" y="11" width="18" height="2" rx="1"/>
          <rect x="3" y="17" width="11" height="2" rx="1"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="px-5 pt-6 pb-28 screen-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Twoje postępy
        </p>
        <h1
          className="font-barlow font-extrabold text-[32px] tracking-tight leading-none"
          style={{ color: "var(--gg-text)" }}
        >
          Statystyki
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
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
            <div className="flex justify-between items-center mb-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-wider truncate pr-1"
                style={{ color: "var(--gg-text-muted)" }}
              >
                {card.label}
              </span>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: card.highlight ? "var(--gg-tag-bg)" : "var(--gg-surface2)",
                  color: card.highlight ? "var(--gg-a2)" : "var(--gg-text-sub)",
                }}
              >
                {card.icon}
              </div>
            </div>
            <div
              className="font-barlow font-black text-[24px] leading-tight num-tabular tracking-tight truncate"
              style={{
                color: card.highlight ? "var(--gg-a2)" : "var(--gg-text)",
              }}
            >
              {card.value}
            </div>
            <div className="text-[10px] font-medium mt-0.5 truncate" style={{ color: "var(--gg-text-muted)" }}>
              {card.sublabel}
            </div>
          </div>
        ))}
      </div>

      {/* Records / Current toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] font-bold tracking-tight" style={{ color: "var(--gg-text)" }}>
          {showCurrent ? "Aktualne obciążenia" : "Rekordy osobiste (PR)"}
        </div>
        <div
          className="flex p-0.5 rounded-xl"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
        >
          <button
            onClick={() => setShowCurrent(false)}
            className="text-[11px] font-bold px-3 py-1 rounded-lg border-none cursor-pointer transition-all"
            style={{
              background: !showCurrent ? "var(--gg-surface)" : "transparent",
              color: !showCurrent ? "var(--gg-text)" : "var(--gg-text-muted)",
              boxShadow: !showCurrent ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Rekordy
          </button>
          <button
            onClick={() => setShowCurrent(true)}
            className="text-[11px] font-bold px-3 py-1 rounded-lg border-none cursor-pointer transition-all"
            style={{
              background: showCurrent ? "var(--gg-surface)" : "transparent",
              color: showCurrent ? "var(--gg-text)" : "var(--gg-text-muted)",
              boxShadow: showCurrent ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Aktualne
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {sortedStats.length === 0 ? (
          <div
            className="rounded-2xl text-[13px] text-center py-10 px-4"
            style={{
              background: "var(--gg-surface)",
              border: "1px dashed var(--gg-border)",
              color: "var(--gg-text-muted)",
            }}
          >
            Brak statystyk. Zakończ pierwszy trening, aby zobaczyć rekordy.
          </div>
        ) : (
          sortedStats.map((entry) => {
            const current = firstSetMap.get(entry.exerciseId);
            const displayWeight = showCurrent
              ? (current ? Number(current.weight).toLocaleString("pl-PL") : "—")
              : Number(entry.maxWeight).toLocaleString("pl-PL");
            const hasData = !showCurrent || !!current;

            return (
              <button
                key={entry.id}
                onClick={() => onOpenExerciseDetails(entry.exerciseId)}
                className="w-full text-left cursor-pointer flex items-center justify-between transition-all duration-150 rounded-2xl p-4 group"
                style={{
                  background: "var(--gg-surface)",
                  border: "1px solid var(--gg-border)",
                  boxShadow: "var(--gg-shadow)",
                  opacity: hasData ? 1 : 0.5,
                }}
              >
                <span
                  className="text-[14px] font-semibold flex-1 truncate pr-3"
                  style={{ color: "var(--gg-text)" }}
                >
                  {entry.exercise?.name ?? "Ćwiczenie"}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="font-mono font-bold text-[15px] num-tabular"
                    style={{ color: !showCurrent ? "var(--gg-a2)" : "var(--gg-text)" }}
                  >
                    {displayWeight} kg
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors group-hover:bg-[var(--gg-surface3)]"
                    style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});
