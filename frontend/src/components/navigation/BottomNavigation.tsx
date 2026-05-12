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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "exercises",
    label: "Ćwiczenia",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
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
      className="flex items-center gap-2 border-none cursor-pointer rounded-full"
      style={{
        padding: "8px 10px 8px 14px",
        background: "var(--gg-surface)",
        border: "1.5px solid var(--gg-a1)",
        boxShadow: "0 0 12px rgba(5,150,105,0.35), 0 0 0 1px rgba(5,150,105,0.15)",
        transition: "all 0.2s ease",
      }}
      aria-label="Kontynuuj trening"
    >
      <div
        className="animate-pulse rounded-full flex-shrink-0"
        style={{ width: 8, height: 8, background: "var(--gg-a1)" }}
      />
      <span
        className="font-barlow font-bold"
        style={{ fontSize: 15, color: "var(--gg-a1)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}
      >
        {formatElapsed(elapsed)}
      </span>
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 28, height: 28, background: "var(--gg-a1)" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
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
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center px-3 pt-2 gap-1"
      style={{
        background: "var(--gg-nav-bg)",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))",
        borderTop: "1px solid var(--gg-border)",
        backdropFilter: "blur(12px)",
        touchAction: "none",
      }}
      role="navigation"
      aria-label="Nawigacja główna"
    >
      {navTabs.map((tab) => {
        const isActive = !isWorkoutDetail && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="flex items-center justify-center w-10 h-10 rounded-xl border-none bg-transparent cursor-pointer transition-colors duration-150"
            style={{ color: isActive ? "var(--gg-a1)" : "var(--gg-text-muted)" }}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.icon(isActive)}
          </button>
        );
      })}

      <button
        onClick={onOpenMenu}
        className="flex items-center justify-center w-10 h-10 rounded-xl border-none bg-transparent cursor-pointer"
        style={{ color: "var(--gg-text-muted)" }}
        aria-label="Otwórz menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
          className="flex items-center gap-2 border-none cursor-pointer rounded-full"
          style={{
            padding: "10px 18px",
            background: "linear-gradient(135deg, #059669, #10B981)",
            boxShadow: "0 4px 20px rgba(5,150,105,0.4)",
            color: "#fff",
            transition: "all 0.2s ease",
          }}
          aria-label="Nowy trening"
        >
          <span className="font-barlow font-bold whitespace-nowrap" style={{ fontSize: 15 }}>
            Nowy trening
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      )}
    </nav>
  );
});
