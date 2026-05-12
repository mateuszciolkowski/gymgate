import { memo, useCallback, type ReactElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { TabType } from "@/types";
import type { Theme } from "@/hooks/useTheme";

const drawerItems: { id: TabType; label: string; icon: ReactElement }[] = [
  {
    id: "trainings",
    label: "Historia treningów",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "exercises",
    label: "Plany treningowe",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const NavigationDrawer = memo(function NavigationDrawer({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
}: NavigationDrawerProps) {
  const { user, logout } = useAuth();

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="absolute top-0 left-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          width: "78%",
          maxWidth: 310,
          background: "var(--gg-bg)",
          borderRight: "1px solid var(--gg-border-med)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: isOpen ? "8px 0 40px rgba(0,0,0,0.45)" : "none",
          willChange: "transform",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu nawigacyjne"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer"
          style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
          aria-label="Zamknij menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* User profile */}
        <div className="px-6 pt-14 pb-8">
          <div
            className="flex items-center justify-center rounded-full font-barlow font-extrabold text-white mb-4"
            style={{
              width: 54,
              height: 54,
              fontSize: 20,
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
                style={{ fontSize: 20, color: "var(--gg-text)" }}
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
        <nav className="flex flex-col px-3 gap-0.5">
          {drawerItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className="flex items-center gap-4 w-full text-left rounded-[14px] border-none cursor-pointer transition-all duration-150"
                style={{
                  padding: "13px 16px",
                  background: isActive ? "var(--gg-grad-soft)" : "transparent",
                }}
              >
                <span style={{ color: isActive ? "var(--gg-a1)" : "var(--gg-text-muted)" }}>
                  {item.icon}
                </span>
                <span
                  className="font-barlow font-bold"
                  style={{ fontSize: 16, color: isActive ? "var(--gg-a1)" : "var(--gg-text)" }}
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
            style={{ padding: "13px 16px" }}
          >
            <span style={{ color: "var(--gg-error)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="font-barlow font-bold text-[16px]" style={{ color: "var(--gg-error)" }}>
              Wyloguj się
            </span>
          </button>
        </div>

        {/* Version */}
        <div className="px-6 pb-6 text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
          GymGate v1.0.0
        </div>
      </div>
    </>
  );
});
