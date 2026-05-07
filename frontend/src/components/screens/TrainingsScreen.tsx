import { memo, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { useData } from "@/contexts/DataContext";
import { WorkoutFormModal } from "@/components/modals";
import type { Workout } from "@/types";

interface TrainingsScreenProps {
  onSelectWorkout: (workoutId: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
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

  return (
    <button
      onClick={onClick}
      className="w-full text-left cursor-pointer transition-all duration-150 active:scale-[0.99]"
      style={{
        background: "var(--gg-surface)",
        border: "1.5px solid var(--gg-border)",
        borderRadius: 18,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "var(--gg-shadow)",
      }}
    >
      <div>
        <div
          className="font-barlow font-extrabold text-[15px] mb-0.5"
          style={{ color: "var(--gg-text)" }}
        >
          {workout.workoutName || "Trening"}
        </div>
        <div className="text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
          {formatDate(workout.workoutDate)}
        </div>
        {workout.gymName && (
          <div className="text-[11px] italic mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            {workout.gymName}
          </div>
        )}
        {workout.durationSeconds != null && (
          <div className="text-[11px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            ⏱ {formatDuration(workout.durationSeconds)}
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <div
          className="font-barlow-condensed font-black text-[16px] leading-none grad-text"
          style={{ letterSpacing: "0.01em" }}
        >
          {exercisesCount} ćwiczeń
        </div>
        <div className="text-[11px] mt-1" style={{ color: "var(--gg-text-muted)" }}>
          {setsCount} serii
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
      <div className="px-5 pt-5 screen-enter">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
            />
            <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Ładowanie...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalWorkouts = statsOverview?.workoutsLastYear ?? completedWorkouts.length;

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
            style={{ color: "var(--gg-text-muted)" }}
          >
            Twoja historia
          </p>
          <h1
            className="font-barlow font-black leading-none"
            style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
          >
            Treningi
          </h1>
        </div>
      </div>

      {/* Streak / stats hero card */}
      <div
        className="relative overflow-hidden mb-5 rounded-[22px]"
        style={{
          background: "var(--gg-grad)",
          padding: "18px 20px",
          boxShadow: "0 8px 36px var(--gg-glow)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ right: -24, top: -24, width: 120, height: 120, background: "rgba(255,255,255,0.07)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ right: 16, bottom: -28, width: 72, height: 72, background: "rgba(255,255,255,0.05)" }}
        />
        <div className="relative">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.10em] mb-1"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Treningi w tym roku
          </div>
          <div
            className="font-barlow-condensed font-black leading-none mb-1"
            style={{ fontSize: 46, color: "#fff", letterSpacing: "-0.02em" }}
          >
            {totalWorkouts} 🔥
          </div>
          <div className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            {completedWorkouts.length} zakończonych
            {statsOverview?.totalSets ? ` · ${statsOverview.totalSets} serii` : ""}
          </div>
        </div>
      </div>

      {/* Draft workouts */}
      {draftWorkouts.length > 0 && (
        <div className="mb-5">
          <div className="text-[13px] font-bold mb-2.5" style={{ color: "var(--gg-text)" }}>
            Treningi w trakcie
          </div>
          <div className="flex flex-col gap-2.5">
            {draftWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onSelectWorkout(workout.id)}
                className="w-full text-left cursor-pointer transition-all duration-150 active:scale-[0.99]"
                style={{
                  background: "var(--gg-active-bg)",
                  border: "1.5px solid var(--gg-active-border)",
                  borderRadius: 18,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 0 0 1px rgba(245,158,11,0.13), 0 4px 24px var(--gg-active-glow)",
                }}
              >
                <div>
                  <div
                    className="font-barlow font-extrabold text-[16px] mb-0.5"
                    style={{ color: "var(--gg-text)" }}
                  >
                    {workout.workoutName || "Trening bez nazwy"}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
                    {formatDate(workout.workoutDate)}
                    {workout.gymName ? ` · ${workout.gymName}` : ""}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                    {workout.items.length} ćwiczeń ·{" "}
                    {workout.items.reduce((s, i) => s + i.sets.length, 0)} serii
                  </div>
                </div>
                <span
                  className="text-[12px] font-bold text-white flex-shrink-0 ml-3"
                  style={{
                    background: "var(--gg-active-border)",
                    borderRadius: 20,
                    padding: "5px 13px",
                  }}
                >
                  W trakcie
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
            Historia treningów
          </span>
          <div className="flex gap-1.5">
            {(["Nowe", "Stare"] as const).map((label, i) => {
              const isActive = (i === 0 && dateSort === "desc") || (i === 1 && dateSort === "asc");
              return (
                <button
                  key={label}
                  onClick={() => setDateSort(i === 0 ? "desc" : "asc")}
                  className="text-[12px] font-semibold cursor-pointer transition-all duration-200 border-none"
                  style={{
                    padding: "5px 13px",
                    borderRadius: 20,
                    background: isActive ? "var(--gg-grad-btn)" : "var(--gg-surface2)",
                    color: isActive ? "#fff" : "var(--gg-text-muted)",
                    boxShadow: isActive ? "0 2px 10px var(--gg-glow-sm)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {completedWorkouts.length === 0 && draftWorkouts.length === 0 ? (
          <EmptyState
            title="Brak zapisanych treningów"
            description="Kliknij FAB aby dodać pierwszy trening"
            icon={
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="5" x2="18" y2="5"/>
                <line x1="6" y1="19" x2="18" y2="19"/>
                <line x1="4" y1="8" x2="4" y2="16"/>
                <line x1="20" y1="8" x2="20" y2="16"/>
                <line x1="2" y1="10" x2="2" y2="14"/>
                <line x1="22" y1="10" x2="22" y2="14"/>
              </svg>
            }
          />
        ) : completedWorkouts.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
            Brak zakończonych treningów
          </p>
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

      {isFormModalOpen && (
        <WorkoutFormModal
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
});
