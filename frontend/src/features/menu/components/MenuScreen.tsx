import { memo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/data";
import type { Theme } from "@/hooks/useTheme";

interface MenuScreenProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const THEMES: { id: Theme; label: string; desc: string; bg: string; accent: string; dot1: string; dot2: string; isDark: boolean }[] = [
  {
    id: "dark",
    label: "Ciemny",
    desc: "Emerald Dark",
    bg: "#090E0D",
    accent: "#111918",
    dot1: "#059669",
    dot2: "#34D399",
    isDark: true,
  },
  {
    id: "steel",
    label: "Stalowy",
    desc: "Steel Blue",
    bg: "#06090F",
    accent: "#0C1220",
    dot1: "#3B82F6",
    dot2: "#93C5FD",
    isDark: true,
  },
  {
    id: "graphite",
    label: "Grafitowy",
    desc: "Graphite Dark",
    bg: "#0A0A0C",
    accent: "#1A1A1F",
    dot1: "#6B7280",
    dot2: "#CBD5E1",
    isDark: true,
  },
  {
    id: "violet",
    label: "Fioletowy",
    desc: "Violet Dark",
    bg: "#0C0812",
    accent: "#160F22",
    dot1: "#A855F7",
    dot2: "#F0ABFC",
    isDark: true,
  },
  {
    id: "ember",
    label: "Bursztynowy",
    desc: "Ember Dark",
    bg: "#100B07",
    accent: "#1C140C",
    dot1: "#F59E0B",
    dot2: "#FBBF24",
    isDark: true,
  },
  {
    id: "crimson",
    label: "Karmazynowy",
    desc: "Crimson Dark",
    bg: "#110808",
    accent: "#1E1010",
    dot1: "#EF4444",
    dot2: "#F87171",
    isDark: true,
  },
  {
    id: "light",
    label: "Jasny",
    desc: "Emerald Light",
    bg: "#EBEFEC",
    accent: "#F5F8F6",
    dot1: "#059669",
    dot2: "#34D399",
    isDark: false,
  },
  {
    id: "blossom",
    label: "Różany",
    desc: "Blossom Light",
    bg: "#EFE8F2",
    accent: "#F8F4FA",
    dot1: "#9333EA",
    dot2: "#EC4899",
    isDark: false,
  },
  {
    id: "sky",
    label: "Niebieski",
    desc: "Sky Light",
    bg: "#E6EDF4",
    accent: "#F2F6FA",
    dot1: "#2563EB",
    dot2: "#93C5FD",
    isDark: false,
  },
  {
    id: "sand",
    label: "Piaskowy",
    desc: "Sand Light",
    bg: "#F1E9D9",
    accent: "#F9F4EA",
    dot1: "#D97706",
    dot2: "#F59E0B",
    isDark: false,
  },
  {
    id: "sage",
    label: "Szałwiowy",
    desc: "Sage Light",
    bg: "#E6EDE4",
    accent: "#F1F6EF",
    dot1: "#16A34A",
    dot2: "#4ADE80",
    isDark: false,
  },
  {
    id: "slate",
    label: "Grafitowy jasny",
    desc: "Slate Light",
    bg: "#E4E7EB",
    accent: "#EFF1F4",
    dot1: "#475569",
    dot2: "#64748B",
    isDark: false,
  },
];

const DARK_THEMES = THEMES.filter((t) => t.isDark);
const LIGHT_THEMES = THEMES.filter((t) => !t.isDark);

function ThemeButtonList({
  themes,
  theme,
  onPick,
}: {
  themes: typeof THEMES;
  theme: Theme;
  onPick: (t: Theme) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {themes.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="flex items-center gap-3.5 w-full text-left rounded-2xl transition-all border-none cursor-pointer"
            style={{
              padding: "12px 14px",
              background: isActive ? "var(--gg-surface2)" : "transparent",
              border: isActive ? "1.5px solid var(--gg-a1)" : "1px solid var(--gg-border)",
            }}
          >
            {/* Palette preview */}
            <div
              className="w-12 h-10 rounded-xl relative overflow-hidden flex-shrink-0"
              style={{ background: t.bg, border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-full h-full"
                style={{ background: t.accent, margin: "4px 4px 0 4px", borderRadius: "4px 4px 0 0" }}
              />
              <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot1 }} />
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot2 }} />
              </div>
            </div>

            <div className="flex-1 text-left">
              <div className="text-[14px] font-bold" style={{ color: "var(--gg-text)" }}>
                {t.label}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                {t.desc}
              </div>
            </div>

            {isActive && (
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-full"
                style={{ width: 22, height: 22, background: "var(--gg-a1)" }}
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
  );
}

function ThemePicker({ theme, setTheme, onClose }: { theme: Theme; setTheme: (t: Theme) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"dark" | "light">(
    THEMES.find((t) => t.id === theme)?.isDark === false ? "light" : "dark",
  );

  const handlePick = (id: Theme) => {
    setTheme(id);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--gg-surface)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid var(--gg-border-med)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          padding: "24px 20px",
          paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto mb-5"
          style={{ width: 40, height: 4, borderRadius: 2, background: "var(--gg-surface3)" }}
        />
        <h3
          className="font-barlow font-extrabold mb-4"
          style={{ fontSize: 20, color: "var(--gg-text)" }}
        >
          Wybierz motyw kolorystyczny
        </h3>

        {/* Dark / Light tabs */}
        <div
          className="grid grid-cols-2 gap-1 mb-4 p-1 rounded-2xl"
          style={{ background: "var(--gg-surface2)" }}
        >
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="py-2 rounded-xl text-[13px] font-bold cursor-pointer border-none transition-all"
              style={{
                background: tab === t ? "var(--gg-surface)" : "transparent",
                color: tab === t ? "var(--gg-text)" : "var(--gg-text-muted)",
                boxShadow: tab === t ? "var(--gg-shadow)" : "none",
              }}
            >
              {t === "dark" ? "Ciemne" : "Jasne"}
            </button>
          ))}
        </div>

        <ThemeButtonList
          themes={tab === "dark" ? DARK_THEMES : LIGHT_THEMES}
          theme={theme}
          onPick={handlePick}
        />
      </div>
    </div>
  );
}

export const MenuScreen = memo(function MenuScreen({ theme, setTheme }: MenuScreenProps) {
  const { user, logout } = useAuth();
  const { resetLocalCache } = useData();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentThemeLabel = THEMES.find((t) => t.id === theme)?.label ?? "Ciemny";

  const items = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
        </svg>
      ),
      label: "Motyw kolorystyczny",
      desc: `Aktualny: ${currentThemeLabel}`,
      onClick: () => setShowThemePicker(true),
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/>
        </svg>
      ),
      label: "Odśwież pamięć podręczną (Cache)",
      desc: "Wyczyść dane offline i pobierz najnowsze z serwera",
      onClick: async () => {
        const confirmed = confirm(
          "Pobrać świeże dane z serwera i zaktualizować lokalną bazę?",
        );
        if (!confirmed) return;

        try {
          await resetLocalCache();
          alert("Pomyślnie zsynchronizowano dane z serwerem.");
        } catch {
          alert("Nie udało się zresetować lokalnego cache.");
        }
      },
    },
  ];

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  return (
    <div className="px-5 pt-6 pb-28 screen-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-0.5"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Ustawienia
        </p>
        <h1
          className="font-barlow font-extrabold text-[30px] tracking-tight leading-none"
          style={{ color: "var(--gg-text)" }}
        >
          Profil i opcje
        </h1>
      </div>

      {/* Profile card */}
      {user && (
        <div
          className="flex items-center gap-3.5 rounded-2xl p-4 mb-5"
          style={{
            background: "var(--gg-surface)",
            border: "1px solid var(--gg-border)",
            boxShadow: "var(--gg-shadow)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-xl font-barlow font-extrabold text-[18px] text-white flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              background: "var(--gg-btn-bg)",
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-barlow font-bold text-[17px] truncate" style={{ color: "var(--gg-text)" }}>
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[12px] truncate" style={{ color: "var(--gg-text-muted)" }}>
              {user.email}
            </div>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className="flex items-center gap-3.5 w-full text-left rounded-2xl transition-all duration-150 active:scale-[0.99] border-none cursor-pointer"
            style={{
              padding: "14px 16px",
              background: "var(--gg-surface)",
              border: "1px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-xl"
              style={{ width: 38, height: 38, background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold truncate" style={{ color: "var(--gg-text)" }}>
                {item.label}
              </div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--gg-text-muted)" }}>
                {item.desc}
              </div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3.5 w-full text-left cursor-pointer rounded-2xl mt-2 transition-all duration-150 active:scale-[0.99] border-none"
          style={{
            padding: "14px 16px",
            background: "var(--gg-surface)",
            border: "1px solid var(--gg-border)",
            boxShadow: "var(--gg-shadow)",
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-xl"
            style={{ width: 38, height: 38, background: "rgba(239,68,68,0.12)", color: "var(--gg-error)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        GymGate v1.0.0 · Offline-First Training App
      </div>

      {showThemePicker && (
        <ThemePicker theme={theme} setTheme={setTheme} onClose={() => setShowThemePicker(false)} />
      )}
    </div>
  );
});
