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
      label: "Treningi / miesiąc",
      value: overview?.workoutsLastMonth ?? 0,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2s-5 6-5 11a5 5 0 0010 0C17 8 12 2 12 2z"/>
        </svg>
      ),
      highlight: true,
    },
    {
      label: "Treningi / rok",
      value: overview?.workoutsLastYear ?? 0,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="13" width="4" height="7" rx="1"/>
          <rect x="10" y="8" width="4" height="12" rx="1"/>
          <rect x="17" y="4" width="4" height="16" rx="1"/>
        </svg>
      ),
    },
    {
      label: "Łączna serii",
      value: overview?.totalSets ?? 0,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="2" rx="1"/>
          <rect x="3" y="11" width="18" height="2" rx="1"/>
          <rect x="3" y="17" width="11" height="2" rx="1"/>
        </svg>
      ),
    },
    {
      label: "Objętość (kg)",
      value: (overview?.totalVolume ?? 0).toLocaleString("pl-PL"),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2M6 9V4h12v5M6 9a6 6 0 0012 0M12 15v4M9 19h6"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Twoje postępy
        </p>
        <h1
          className="font-barlow font-black leading-none"
          style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
        >
          Statystyki
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-[20px]"
            style={{
              padding: "16px 14px",
              background: card.highlight ? "var(--gg-grad-btn)" : "var(--gg-surface)",
              border: card.highlight ? "none" : "1.5px solid var(--gg-border)",
              boxShadow: card.highlight ? "0 6px 28px var(--gg-glow)" : "var(--gg-shadow)",
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <span
                className="text-[11px] font-semibold leading-tight"
                style={{ color: card.highlight ? "rgba(255,255,255,0.72)" : "var(--gg-text-muted)" }}
              >
                {card.label}
              </span>
              <div
                className="flex items-center justify-center rounded-[9px] flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  background: card.highlight ? "rgba(255,255,255,0.2)" : "var(--gg-surface2)",
                  color: card.highlight ? "#fff" : "var(--gg-a1)",
                }}
              >
                {card.icon}
              </div>
            </div>
            <div
              className="font-barlow-condensed font-black"
              style={{
                fontSize: 30,
                letterSpacing: "-0.02em",
                color: card.highlight ? "#fff" : "var(--gg-text)",
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Records / Current toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
          {showCurrent ? "Aktualne ciężary" : "Rekordy osobiste"}
        </div>
        <div
          className="flex rounded-[12px] p-0.5"
          style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)" }}
        >
          <button
            onClick={() => setShowCurrent(false)}
            className="text-[11px] font-bold rounded-[10px] transition-all duration-200"
            style={{
              padding: "5px 11px",
              background: !showCurrent ? "var(--gg-grad-btn)" : "transparent",
              color: !showCurrent ? "#fff" : "var(--gg-text-muted)",
              border: "none",
              cursor: "pointer",
              boxShadow: !showCurrent ? "0 2px 8px var(--gg-glow-sm)" : "none",
            }}
          >
            Rekordy
          </button>
          <button
            onClick={() => setShowCurrent(true)}
            className="text-[11px] font-bold rounded-[10px] transition-all duration-200"
            style={{
              padding: "5px 11px",
              background: showCurrent ? "var(--gg-grad-btn)" : "transparent",
              color: showCurrent ? "#fff" : "var(--gg-text-muted)",
              border: "none",
              cursor: "pointer",
              boxShadow: showCurrent ? "0 2px 8px var(--gg-glow-sm)" : "none",
            }}
          >
            Aktualne
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {sortedStats.length === 0 ? (
          <div
            className="rounded-[16px] text-[13px] text-center py-6"
            style={{
              background: "var(--gg-surface)",
              border: "1.5px solid var(--gg-border)",
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
                className="w-full text-left cursor-pointer flex items-center justify-between transition-all duration-150 rounded-[20px]"
                style={{
                  padding: "12px 16px",
                  background: "var(--gg-surface)",
                  border: "1.5px solid var(--gg-border)",
                  boxShadow: "var(--gg-shadow)",
                  opacity: hasData ? 1 : 0.45,
                }}
              >
                <span
                  className="text-[13px] font-semibold flex-1 leading-snug"
                  style={{ color: "var(--gg-text)" }}
                >
                  {entry.exercise?.name ?? "Ćwiczenie"}
                </span>
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                  <span
                    className={`font-barlow-condensed font-black text-[18px] ${!showCurrent ? "grad-text" : ""}`}
                    style={{ color: showCurrent ? "var(--gg-text)" : undefined }}
                  >
                    {displayWeight} kg
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: "var(--gg-a2)" }}>→</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});
