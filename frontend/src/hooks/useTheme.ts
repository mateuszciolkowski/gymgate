import { useState, useEffect } from "react";

export type Theme =
  | "dark"
  | "steel"
  | "graphite"
  | "violet"
  | "ember"
  | "crimson"
  | "light"
  | "blossom"
  | "sky"
  | "sand"
  | "sage"
  | "slate";

const VALID_THEMES: Theme[] = [
  "dark",
  "steel",
  "graphite",
  "violet",
  "ember",
  "crimson",
  "light",
  "blossom",
  "sky",
  "sand",
  "sage",
  "slate",
];

const DARK_THEMES = new Set<Theme>(["dark", "steel", "graphite", "violet", "ember", "crimson"]);

interface UseThemeReturn {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

function applyThemeClass(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove(...VALID_THEMES);
  html.classList.add(theme);
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial: Theme =
      stored && VALID_THEMES.includes(stored) ? stored : "dark";
    applyThemeClass(initial);
    return initial;
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    applyThemeClass(theme);
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
    isDark: DARK_THEMES.has(theme),
  };
}
