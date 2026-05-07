import { memo, useCallback } from "react";
import type { TabType } from "@/types";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddWorkout: () => void;
  isWorkoutDetail?: boolean;
  hasActiveWorkout?: boolean;
}

const tabs = [
  {
    id: "trainings" as TabType,
    label: "Treningi",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="2" rx="1"/>
        <rect x="3" y="11" width="18" height="2" rx="1"/>
        <rect x="3" y="17" width="11" height="2" rx="1"/>
      </svg>
    ),
  },
  {
    id: "exercises" as TabType,
    label: "Ćwiczenia",
    icon: (active: boolean) => (
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
    id: "stats" as TabType,
    label: "Statystyki",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="4" height="7" rx="1"/>
        <rect x="10" y="8" width="4" height="12" rx="1"/>
        <rect x="17" y="4" width="4" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    id: "menu" as TabType,
    label: "Menu",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="7" x2="20" y2="7"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="17" x2="16" y2="17"/>
      </svg>
    ),
  },
];

export const BottomNavigation = memo(function BottomNavigation({
  activeTab,
  onTabChange,
  onAddWorkout,
  isWorkoutDetail = false,
  hasActiveWorkout = false,
}: BottomNavigationProps) {
  const handleTabChange = useCallback(
    (tab: TabType) => onTabChange(tab),
    [onTabChange],
  );

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pt-2"
      style={{
        background: "var(--gg-nav-bg)",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
        borderTop: "1px solid var(--gg-border)",
        backdropFilter: "blur(12px)",
        touchAction: "none",
      }}
      role="navigation"
      aria-label="Nawigacja główna"
    >
      {tabs.slice(0, 2).map((tab) => {
        const isActive = !isWorkoutDetail && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="flex flex-col items-center px-4 py-1 relative border-none bg-transparent cursor-pointer"
            style={{ color: isActive ? "var(--gg-a1)" : "var(--gg-text-muted)" }}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[26px] h-[3px] rounded-[2px]"
                style={{ top: -10, background: "var(--gg-grad)" }}
              />
            )}
            {tab.icon(isActive)}
          </button>
        );
      })}

      {/* FAB */}
      <button
        onClick={onAddWorkout}
        className="flex items-center justify-center flex-shrink-0 border-none cursor-pointer"
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: hasActiveWorkout
            ? "linear-gradient(135deg, #F59E0B, #FBBF24)"
            : "linear-gradient(135deg, #059669, #10B981)",
          boxShadow: hasActiveWorkout
            ? "0 4px 24px rgba(245,158,11,0.5), 0 0 0 3px rgba(245,158,11,0.15)"
            : "0 4px 24px rgba(5,150,105,0.4), 0 0 0 3px rgba(5,150,105,0.12)",
          transform: "translateY(-10px)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        aria-label={hasActiveWorkout ? "Kontynuuj trening" : "Nowy trening"}
      >
        {hasActiveWorkout ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8.5" y1="12" x2="15.5" y2="12"/>
            <line x1="5" y1="8.5" x2="5" y2="15.5"/>
            <line x1="7.5" y1="7" x2="7.5" y2="17"/>
            <line x1="16.5" y1="7" x2="16.5" y2="17"/>
            <line x1="19" y1="8.5" x2="19" y2="15.5"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="4" x2="12" y2="20"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
          </svg>
        )}
      </button>

      {tabs.slice(2).map((tab) => {
        const isActive = !isWorkoutDetail && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="flex flex-col items-center px-4 py-1 relative border-none bg-transparent cursor-pointer"
            style={{ color: isActive ? "var(--gg-a1)" : "var(--gg-text-muted)" }}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[26px] h-[3px] rounded-[2px]"
                style={{ top: -10, background: "var(--gg-grad)" }}
              />
            )}
            {tab.icon(isActive)}
          </button>
        );
      })}
    </nav>
  );
});
