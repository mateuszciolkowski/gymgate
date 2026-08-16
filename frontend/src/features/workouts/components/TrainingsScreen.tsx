import { memo, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { useData } from "@/contexts/data";
import { WorkoutFormModal } from "./WorkoutFormModal";
import type { Workout } from "@/types";

interface TrainingsScreenProps {
  onSelectWorkout: (workoutId: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

const WorkoutCard = memo(function WorkoutCard({
  workout,
  onClick,
}: {
  workout: Workout;
  onClick: () => void;
}) {
  const exercisesCount = workout.items.length;
  const setsCount = workout.items.reduce((s, i) => s + i.sets.length, 0);
  const duration = formatDuration(workout.durationSeconds);

  return (
    <button
      onClick={onClick}
      className="w-full text-left cursor-pointer transition-all duration-150 active:scale-[0.99] group rounded-2xl p-4 flex items-center justify-between"
      style={{
        background: "var(--gg-surface)",
        border: "1px solid var(--gg-border)",
        boxShadow: "var(--gg-shadow)",
      }}
    >
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-barlow font-bold text-[15px] truncate tracking-tight"
            style={{ color: "var(--gg-text)" }}
          >
            {workout.workoutName || "Trening"}
          </span>
          {duration && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap num-tabular"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
            >
              {duration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
          <span>{formatDate(workout.workoutDate)}</span>
          {workout.gymName && (
            <>
              <span>•</span>
              <span className="truncate">{workout.gymName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div
            className="font-barlow font-extrabold text-[15px] num-tabular"
            style={{ color: "var(--gg-text)" }}
          >
            {exercisesCount} <span className="text-[11px] font-normal text-muted-foreground" style={{ color: "var(--gg-text-muted)" }}>ćw.</span>
          </div>
          <div className="text-[11px] font-medium num-tabular" style={{ color: "var(--gg-text-sub)" }}>
            {setsCount} serii
          </div>
        </div>

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[var(--gg-surface3)]"
          style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
});

export const TrainingsScreen = memo(function TrainingsScreen({
  onSelectWorkout,
}: TrainingsScreenProps) {
  const { workouts, isLoading: loading, createWorkout, statsOverview } = useData();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");

  const handleFormSubmit = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    workoutPlanId?: string;
  }) => {
    try {
      const newWorkout = await createWorkout(data);
      setIsFormModalOpen(false);
      onSelectWorkout(newWorkout.id);
    } catch {
      alert("Błąd tworzenia treningu");
    }
  };

  const sortFn = (a: Workout, b: Workout) => {
    const diff = new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime();
    return dateSort === "desc" ? diff : -diff;
  };

  const draftWorkouts = useMemo(
    () => workouts.filter((w) => w.status === "DRAFT").sort(sortFn),
    [workouts, dateSort],
  );
  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.status === "COMPLETED").sort(sortFn),
    [workouts, dateSort],
  );

  if (loading) {
    return (
      <div className="px-5 pt-6 screen-enter">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
            />
            <p className="text-[13px] font-medium" style={{ color: "var(--gg-text-muted)" }}>Ładowanie sesji...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalWorkouts = statsOverview?.workoutsLastYear ?? completedWorkouts.length;
  const totalSets = statsOverview?.totalSets;

  return (
    <div className="px-5 pt-6 pb-28 screen-enter max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="mb-4">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-0.5"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Dziennik treningowy
        </p>
        <h1
          className="font-barlow font-extrabold text-[30px] tracking-tight leading-none"
          style={{ color: "var(--gg-text)" }}
        >
          Treningi
        </h1>
      </div>

      {/* Modern Compact Activity Bar */}
      <div
        className="rounded-2xl p-3.5 mb-5 flex items-center justify-between"
        style={{
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
        }}
      >
        <div className="flex items-center gap-4 text-[13px] num-tabular">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--gg-text-muted)" }}>
              Ten rok
            </span>
            <strong className="font-extrabold text-[16px]" style={{ color: "var(--gg-text)" }}>
              {totalWorkouts}
            </strong>{" "}
            <span className="text-[11px]" style={{ color: "var(--gg-text-muted)" }}>treningów</span>
          </div>

          <div className="border-l h-7" style={{ borderColor: "var(--gg-border)" }} />

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--gg-text-muted)" }}>
              Wykonano
            </span>
            <strong className="font-extrabold text-[16px]" style={{ color: "var(--gg-a2)" }}>
              {totalSets ?? "–"}
            </strong>{" "}
            <span className="text-[11px]" style={{ color: "var(--gg-text-muted)" }}>serii</span>
          </div>
        </div>

        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
          style={{ background: "var(--gg-tag-bg)", color: "var(--gg-tag-text)" }}
        >
          Aktywność
        </span>
      </div>

      {/* Active draft workouts */}
      {draftWorkouts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-text-sub)" }}>
              Trening w toku
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {draftWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onSelectWorkout(workout.id)}
                className="w-full text-left cursor-pointer transition-all duration-150 active:scale-[0.99] rounded-2xl p-4 flex items-center justify-between"
                style={{
                  background: "var(--gg-active-bg)",
                  border: "1.5px solid var(--gg-active-border)",
                  boxShadow: "0 2px 12px var(--gg-active-glow)",
                }}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div
                    className="font-barlow font-bold text-[16px] truncate mb-1"
                    style={{ color: "var(--gg-text)" }}
                  >
                    {workout.workoutName || "Aktywny trening"}
                  </div>
                  <div className="text-[12px] font-medium num-tabular" style={{ color: "var(--gg-text-sub)" }}>
                    {workout.items.length} ćwiczeń ·{" "}
                    {workout.items.reduce((s, i) => s + i.sets.length, 0)} zalogowanych serii
                  </div>
                </div>

                <div
                  className="px-3 py-1.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 shrink-0 shadow-sm"
                  style={{
                    background: "var(--gg-active-border)",
                    color: "#000",
                  }}
                >
                  <span>Wróć</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completed workouts history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gg-text-muted)" }}>
              Historia sesji
            </span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md num-tabular"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
            >
              {completedWorkouts.length}
            </span>
          </div>

          {completedWorkouts.length > 1 && (
            <button
              onClick={() => setDateSort((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="flex items-center gap-1 text-[11px] font-semibold border-none bg-transparent cursor-pointer px-2 py-1 rounded-lg transition-colors"
              style={{ color: "var(--gg-text-sub)" }}
            >
              <span>{dateSort === "desc" ? "Od najnowszych" : "Od najstarszych"}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={dateSort === "desc" ? "6 9 12 15 18 9" : "18 15 12 9 6 9"}/>
              </svg>
            </button>
          )}
        </div>

        {completedWorkouts.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--gg-surface)", border: "1px dashed var(--gg-border-med)" }}
          >
            <EmptyState
              title="Brak ukończonych treningów"
              description="Rozpocznij swój pierwszy trening, klikając przycisk powyżej."
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gg-text-muted)" }}>
                  <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12"/>
                </svg>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {completedWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onClick={() => onSelectWorkout(workout.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Workout Modal */}
      {isFormModalOpen && (
        <WorkoutFormModal
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
});
