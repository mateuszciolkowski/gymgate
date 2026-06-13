import type { Workout } from "@/types";
import { computeWorkoutLastActivity } from "@/utils/workoutTimer";

interface StaleWorkoutDialogProps {
  workout: Workout;
  onComplete: () => void;
  onDismiss: () => void;
}

export function StaleWorkoutDialog({ workout, onComplete, onDismiss }: StaleWorkoutDialogProps) {
  const lastActivity = computeWorkoutLastActivity(workout);
  const diffMs = Date.now() - lastActivity;
  const hoursAgo = Math.floor(diffMs / (60 * 60 * 1000));
  const minutesAgo = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  const timeLabel = hoursAgo > 0
    ? `${hoursAgo}h ${minutesAgo}min`
    : `${minutesAgo} min`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-[22px] p-5"
        style={{
          background: "var(--gg-surface)",
          border: "1.5px solid var(--gg-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: 36, height: 36, background: "var(--gg-active-bg)", border: "1.5px solid var(--gg-active-border)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gg-active-border)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold" style={{ color: "var(--gg-text)" }}>Trening się skończył?</p>
            <p className="text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
              Ostatnia aktywność {timeLabel} temu
            </p>
          </div>
        </div>
        {workout.workoutName && (
          <p className="text-[13px] mb-3" style={{ color: "var(--gg-text-sub)" }}>
            {workout.workoutName}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer"
            style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}
          >
            Kontynuuj
          </button>
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer text-white border-none"
            style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}
          >
            Zakończ trening
          </button>
        </div>
      </div>
    </div>
  );
}
