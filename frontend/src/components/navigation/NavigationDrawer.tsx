import { memo, useCallback, useRef, useState, type ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { TabType } from "@/types";
import type { Theme } from "@/hooks/useTheme";

const DRAWER_WIDTH = 330;
const OPEN_THRESHOLD = DRAWER_WIDTH * 0.35;
const CLOSE_THRESHOLD = DRAWER_WIDTH * 0.3;
const DRAG_START_SLOP = 8;

const drawerItems: { id: TabType; label: string; icon: ReactElement }[] = [
  {
    id: "trainings",
    label: "Historia treningów",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "exercises",
    label: "Ćwiczenia",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="13" width="4" height="7" rx="1"/>
        <rect x="10" y="8" width="4" height="12" rx="1"/>
        <rect x="17" y="4" width="4" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Ustawienia",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const NavigationDrawer = memo(function NavigationDrawer({
  isOpen,
  onClose,
  onOpen,
  activeTab,
  onNavigate,
}: NavigationDrawerProps) {
  const { user, logout } = useAuth();

  const [dragState, setDragState] = useState<{
    mode: "opening" | "closing" | null;
    offset: number;
  }>({ mode: null, offset: 0 });

  const touchStartX = useRef(0);
  const currentOffset = useRef(0);
  const dragModeRef = useRef<"opening" | "closing" | null>(null);

  const isDragging = dragState.mode !== null;

  // Compute transform and backdrop opacity based on drag or isOpen
  let drawerTransform: string;
  let backdropOpacity: number;
  if (dragState.mode === "opening") {
    const clamped = Math.max(0, Math.min(DRAWER_WIDTH, dragState.offset));
    drawerTransform = `translateX(calc(-100% + ${clamped}px))`;
    backdropOpacity = clamped / DRAWER_WIDTH;
  } else if (dragState.mode === "closing") {
    const clamped = Math.max(0, dragState.offset);
    drawerTransform = `translateX(-${clamped}px)`;
    backdropOpacity = Math.max(0, 1 - clamped / DRAWER_WIDTH);
  } else {
    drawerTransform = isOpen ? "translateX(0)" : "translateX(-100%)";
    backdropOpacity = isOpen ? 1 : 0;
  }

  // --- Edge zone handlers (swipe-to-open) ---
  const handleEdgeTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    currentOffset.current = 0;
    dragModeRef.current = null;
  }, []);

  const handleEdgeTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta > DRAG_START_SLOP || dragModeRef.current === "opening") {
      dragModeRef.current = "opening";
      const offset = Math.max(0, delta);
      currentOffset.current = offset;
      setDragState({ mode: "opening", offset });
    }
  }, []);

  const handleEdgeTouchEnd = useCallback(() => {
    const finalOffset = currentOffset.current;
    const wasOpening = dragModeRef.current === "opening";
    dragModeRef.current = null;
    setDragState({ mode: null, offset: 0 });
    if (wasOpening && finalOffset >= OPEN_THRESHOLD) {
      onOpen();
    }
  }, [onOpen]);

  // --- Backdrop handlers (swipe-to-close) ---
  const handleBackdropTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    currentOffset.current = 0;
    dragModeRef.current = null;
  }, []);

  const handleBackdropTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.touches[0].clientX;
    if (delta > DRAG_START_SLOP || dragModeRef.current === "closing") {
      dragModeRef.current = "closing";
      const offset = Math.max(0, delta);
      currentOffset.current = offset;
      setDragState({ mode: "closing", offset });
    }
  }, []);

  const handleBackdropTouchEnd = useCallback(() => {
    const finalOffset = currentOffset.current;
    const wasClosing = dragModeRef.current === "closing";
    dragModeRef.current = null;
    setDragState({ mode: null, offset: 0 });
    if (wasClosing && finalOffset >= CLOSE_THRESHOLD) {
      onClose();
    }
  }, [onClose]);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const handleNavigate = useCallback(
    (tab: TabType) => {
      onNavigate(tab);
      onClose();
    },
    [onNavigate, onClose],
  );

  const handleLogout = useCallback(() => {
    logout();
    onClose();
  }, [logout, onClose]);

  return (
    <>
      {/* Edge zone for swipe-to-open (invisible, left edge, above nav) */}
      <div
        className="absolute left-0 top-0 z-[35]"
        style={{
          width: 24,
          bottom: 80,
          touchAction: "none",
          pointerEvents: isOpen ? "none" : "auto",
        }}
        onTouchStart={handleEdgeTouchStart}
        onTouchMove={handleEdgeTouchMove}
        onTouchEnd={handleEdgeTouchEnd}
        aria-hidden="true"
      />

      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
          opacity: backdropOpacity,
          pointerEvents: (isOpen || dragState.mode === "opening") ? "auto" : "none",
          transition: isDragging ? "none" : "opacity 0.3s",
          touchAction: "none",
        }}
        onClick={onClose}
        onTouchStart={isOpen ? handleBackdropTouchStart : undefined}
        onTouchMove={isOpen ? handleBackdropTouchMove : undefined}
        onTouchEnd={isOpen ? handleBackdropTouchEnd : undefined}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="absolute top-0 left-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "82%",
          maxWidth: DRAWER_WIDTH,
          background: "var(--gg-bg)",
          borderRight: "1px solid var(--gg-border-med)",
          transform: drawerTransform,
          transition: isDragging ? "none" : "transform 0.3s",
          boxShadow: (isOpen || isDragging) ? "8px 0 40px rgba(0,0,0,0.45)" : "none",
          willChange: "transform",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu nawigacyjne"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full border-none cursor-pointer"
          style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
          aria-label="Zamknij menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* User profile */}
        <div className="px-7 pt-16 pb-9">
          <div
            className="flex items-center justify-center rounded-full font-barlow font-extrabold text-white mb-4"
            style={{
              width: 60,
              height: 60,
              fontSize: 22,
              background: "var(--gg-grad-btn)",
              boxShadow: "0 4px 20px var(--gg-glow)",
            }}
          >
            {initials}
          </div>
          {user && (
            <>
              <div
                className="font-barlow font-extrabold"
                style={{ fontSize: 21, color: "var(--gg-text)" }}
              >
                {user.firstName} {user.lastName}
              </div>
              <div className="mt-0.5 text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
                {user.email}
              </div>
            </>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col px-3 gap-1">
          {drawerItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className="flex items-center gap-4 w-full text-left rounded-[14px] border-none cursor-pointer transition-all duration-150"
                style={{
                  padding: "15px 18px",
                  background: isActive ? "var(--gg-grad-soft)" : "transparent",
                }}
              >
                <span style={{ color: isActive ? "var(--gg-a1)" : "var(--gg-text-muted)" }}>
                  {item.icon}
                </span>
                <span
                  className="font-barlow font-bold"
                  style={{ fontSize: 17, color: isActive ? "var(--gg-a1)" : "var(--gg-text)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Logout */}
        <div className="px-3 pb-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full text-left rounded-[14px] border-none cursor-pointer transition-all duration-150"
            style={{ padding: "15px 18px" }}
          >
            <span style={{ color: "var(--gg-error)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="font-barlow font-bold text-[17px]" style={{ color: "var(--gg-error)" }}>
              Wyloguj się
            </span>
          </button>
        </div>

        {/* Version */}
        <div className="px-7 pb-7 text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
          GymGate v1.0.0
        </div>
      </div>
    </>
  );
});
