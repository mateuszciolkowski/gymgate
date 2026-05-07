import { useState, useEffect } from "react";

export type Theme = "dark" | "light" | "violet" | "blossom";

const VALID_THEMES: Theme[] = ["dark", "light", "violet", "blossom"];

interface UseThemeReturn {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

function applyThemeClass(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "violet", "blossom");
  if (theme === "dark") html.classList.add("dark");
  if (theme === "violet") html.classList.add("violet");
  if (theme === "blossom") html.classList.add("blossom");
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
    isDark: theme === "dark",
  };
}
