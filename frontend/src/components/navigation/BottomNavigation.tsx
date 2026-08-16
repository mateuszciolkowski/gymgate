import { memo, useCallback, useEffect, useState, type ReactElement } from "react";
import type { TabType } from "@/types";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddWorkout: () => void;
  onOpenMenu: () => void;
  isWorkoutDetail?: boolean;
  hasActiveWorkout?: boolean;
  workoutStartedAt?: string | null;
}

const navTabs: { id: TabType; label: string; icon: (active: boolean) => ReactElement }[] = [
  {
    id: "trainings",
    label: "Treningi",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "exercises",
    label: "Ćwiczenia",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="8.5" y1="12" x2="15.5" y2="12"/>
        <line x1="5" y1="8.5" x2="5" y2="15.5"/>
        <line x1="7.5" y1="7" x2="7.5" y2="17"/>
        <line x1="16.5" y1="7" x2="16.5" y2="17"/>
        <line x1="19" y1="8.5" x2="19" y2="15.5"/>
      </svg>
    ),
  },
  {
    id: "stats",
    label: "Statystyki",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="4" height="7" rx="1"/>
        <rect x="10" y="8" width="4" height="12" rx="1"/>
        <rect x="17" y="4" width="4" height="16" rx="1"/>
      </svg>
    ),
  },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WorkoutTimerPill({
  onClick,
  workoutStartedAt,
}: {
  onClick: () => void;
  workoutStartedAt: string;
}) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(workoutStartedAt).getTime()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(workoutStartedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [workoutStartedAt]);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 border-none cursor-pointer rounded-full transition-transform active:scale-95 px-3.5 py-1.5"
      style={{
        background: "var(--gg-surface2)",
        border: "1px solid var(--gg-a1)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      }}
      aria-label="Kontynuuj trening"
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse shrink-0"
        style={{ background: "var(--gg-a1)" }}
      />
      <span
        className="font-mono font-bold text-[14px] num-tabular"
        style={{
          color: "var(--gg-a2)",
          minWidth: "5ch",
          textAlign: "center",
        }}
      >
        {formatElapsed(elapsed)}
      </span>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
        style={{ background: "var(--gg-btn-bg)" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

export const BottomNavigation = memo(function BottomNavigation({
  activeTab,
  onTabChange,
  onAddWorkout,
  onOpenMenu,
  isWorkoutDetail = false,
  hasActiveWorkout = false,
  workoutStartedAt,
}: BottomNavigationProps) {
  const handleTabChange = useCallback(
    (tab: TabType) => onTabChange(tab),
    [onTabChange],
  );

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.5rem",
      }}
      role="navigation"
      aria-label="Nawigacja główna"
    >
      <div
        className="flex items-center gap-1.5 w-full max-w-md pointer-events-auto rounded-full px-2 py-1.5"
        style={{
          background: "var(--gg-nav-bg)",
          border: "1px solid var(--gg-border-med)",
          boxShadow: "var(--gg-shadow-elevated)",
          backdropFilter: "blur(20px)",
        }}
      >
        {navTabs.map((tab) => {
          const isActive = !isWorkoutDetail && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center justify-center w-10 h-10 rounded-full border-none cursor-pointer transition-all active:scale-95"
              style={{
                background: isActive ? "var(--gg-surface2)" : "transparent",
                color: isActive ? "var(--gg-a2)" : "var(--gg-text-muted)",
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon(isActive)}
            </button>
          );
        })}

        <button
          onClick={onOpenMenu}
          className="flex items-center justify-center w-10 h-10 rounded-full border-none bg-transparent cursor-pointer transition-all active:scale-95"
          style={{ color: "var(--gg-text-muted)" }}
          aria-label="Otwórz menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="16" y2="17"/>
          </svg>
        </button>

        <div className="flex-1" />

        {hasActiveWorkout && workoutStartedAt ? (
          <WorkoutTimerPill onClick={onAddWorkout} workoutStartedAt={workoutStartedAt} />
        ) : (
          <button
            onClick={onAddWorkout}
            className="flex items-center gap-2 border-none cursor-pointer rounded-full px-4 py-2 text-white transition-all active:scale-95"
            style={{
              background: "var(--gg-btn-bg)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
            aria-label="Nowy trening"
          >
            <span className="font-barlow font-bold text-[14px] whitespace-nowrap">
              Nowy trening
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
});
