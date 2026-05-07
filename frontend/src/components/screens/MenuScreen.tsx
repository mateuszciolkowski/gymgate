import { memo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Theme } from "@/hooks/useTheme";

interface MenuScreenProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const THEMES: { id: Theme; label: string; desc: string; bg: string; accent: string; dot1: string; dot2: string }[] = [
  {
    id: "dark",
    label: "Ciemny",
    desc: "Emerald Dark",
    bg: "#090E0D",
    accent: "#111918",
    dot1: "#059669",
    dot2: "#34D399",
  },
  {
    id: "light",
    label: "Jasny",
    desc: "Emerald Light",
    bg: "#F2F7F4",
    accent: "#FFFFFF",
    dot1: "#059669",
    dot2: "#34D399",
  },
  {
    id: "violet",
    label: "Fioletowy",
    desc: "Violet Glow ✨",
    bg: "#0C0812",
    accent: "#160F22",
    dot1: "#A855F7",
    dot2: "#F0ABFC",
  },
  {
    id: "blossom",
    label: "Różowy",
    desc: "Blossom Light ✿",
    bg: "#FDF8FF",
    accent: "#F5EEFF",
    dot1: "#9333EA",
    dot2: "#EC4899",
  },
];

function ThemePicker({ theme, setTheme, onClose }: { theme: Theme; setTheme: (t: Theme) => void; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--gg-surface)",
          borderRadius: "28px 28px 0 0",
          border: "1.5px solid var(--gg-border-med)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          padding: "28px 20px",
          paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto mb-6"
          style={{ width: 40, height: 4, borderRadius: 2, background: "var(--gg-surface3)" }}
        />
        <h3
          className="font-barlow font-black mb-5"
          style={{ fontSize: 22, color: "var(--gg-text)" }}
        >
          Wybierz motyw
        </h3>
        <div className="flex flex-col gap-3">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); onClose(); }}
                className="flex items-center gap-4 w-full rounded-[18px] border-none cursor-pointer transition-all duration-200"
                style={{
                  padding: "14px 16px",
                  background: isActive ? "var(--gg-grad-soft)" : "var(--gg-surface2)",
                  border: `1.5px solid ${isActive ? "var(--gg-a1)" : "var(--gg-border)"}`,
                  boxShadow: isActive ? "0 0 0 1px var(--gg-a1), var(--gg-shadow-glow)" : "none",
                }}
              >
                {/* Color preview */}
                <div
                  className="flex-shrink-0 rounded-[12px] overflow-hidden relative"
                  style={{ width: 46, height: 46, background: t.bg, border: "1.5px solid rgba(255,255,255,0.12)" }}
                >
                  <div
                    className="absolute inset-0 rounded-[10px]"
                    style={{ background: t.accent, margin: "6px 6px 0 6px", borderRadius: "6px 6px 0 0" }}
                  />
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot1 }} />
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot2 }} />
                  </div>
                </div>

                <div className="flex-1 text-left">
                  <div className="text-[15px] font-bold" style={{ color: "var(--gg-text)" }}>
                    {t.label}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                    {t.desc}
                  </div>
                </div>

                {isActive && (
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{ width: 24, height: 24, background: "var(--gg-a1)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const MenuScreen = memo(function MenuScreen({ theme, setTheme }: MenuScreenProps) {
  const { user, logout } = useAuth();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentThemeLabel = THEMES.find((t) => t.id === theme)?.label ?? "Ciemny";

  const items = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      label: "Profil",
      desc: "Zarządzaj swoim profilem",
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
      label: "Ustawienia",
      desc: "Preferencje aplikacji",
      onClick: undefined as (() => void) | undefined,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
        </svg>
      ),
      label: "Motywy",
      desc: `Aktualny: ${currentThemeLabel}`,
      onClick: () => setShowThemePicker(true),
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      ),
      label: "Eksportuj dane",
      desc: "Pobierz dane treningowe",
      onClick: undefined as (() => void) | undefined,
    },
  ];

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Ustawienia
        </p>
        <h1
          className="font-barlow font-black leading-none"
          style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
        >
          Menu
        </h1>
      </div>

      {/* Profile hero card */}
      {user && (
        <div
          className="flex items-center gap-4 rounded-[22px] mb-5"
          style={{
            padding: 18,
            background: "var(--gg-grad-soft)",
            border: "1.5px solid var(--gg-border-med)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-full font-barlow font-extrabold text-[18px] text-white flex-shrink-0"
            style={{
              width: 52,
              height: 52,
              background: "var(--gg-grad-btn)",
              boxShadow: "0 4px 16px var(--gg-glow)",
            }}
          >
            {initials}
          </div>
          <div>
            <div className="font-barlow font-extrabold text-[17px]" style={{ color: "var(--gg-text)" }}>
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
              {user.email}
            </div>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className="flex items-center gap-3 w-full text-left rounded-[16px] transition-all duration-150"
            style={{
              padding: "14px 16px",
              background: "var(--gg-surface)",
              border: "1.5px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
              opacity: item.onClick ? 1 : 0.6,
              cursor: item.onClick ? "pointer" : "default",
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-[12px]"
              style={{ width: 38, height: 38, background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold" style={{ color: "var(--gg-text)" }}>
                {item.label}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                {item.desc}
              </div>
            </div>
            {item.onClick && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )}
          </button>
        ))}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full text-left cursor-pointer rounded-[16px] mt-2 transition-all duration-150"
          style={{
            padding: "14px 16px",
            background: "var(--gg-surface)",
            border: "1.5px solid var(--gg-border)",
            boxShadow: "var(--gg-shadow)",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-[12px]"
            style={{ width: 38, height: 38, background: "rgba(239,68,68,0.12)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold" style={{ color: "var(--gg-error)" }}>
              Wyloguj się
            </div>
          </div>
        </button>
      </div>

      <div className="mt-8 text-center text-[12px]" style={{ color: "var(--gg-text-muted)" }}>
        GymGate v1.0.0
      </div>

      {showThemePicker && (
        <ThemePicker theme={theme} setTheme={setTheme} onClose={() => setShowThemePicker(false)} />
      )}
    </div>
  );
});
