import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { THEME_NAMES, themes } from "./themes.generated";
import type { Theme, ThemeName } from "./types";

/** Same default and storage key as the PWA (`localStorage["theme"]`, default "dark"). */
export const DEFAULT_THEME: ThemeName = "dark";
export const THEME_STORAGE_KEY = "theme";

/** Synchronous device-level key/value store (expo-sqlite/kv-store in the app, a fake in tests). */
export interface ThemeStorage {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
}

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  isDark: boolean;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEME_NAMES as readonly string[]).includes(value);
}

function readStored(storage: ThemeStorage): ThemeName {
  try {
    const stored = storage.getItemSync(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({
  storage,
  children,
}: {
  storage: ThemeStorage;
  children: ReactNode;
}) {
  const [themeName, setThemeName] = useState<ThemeName>(() => readStored(storage));

  const setTheme = useCallback(
    (name: ThemeName) => {
      setThemeName(name);
      try {
        storage.setItemSync(THEME_STORAGE_KEY, name);
      } catch {
        // persistence is best-effort; the choice still applies for this session
      }
    },
    [storage],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const theme: Theme = themes[themeName];
    return { theme, themeName, isDark: theme.isDark, setTheme };
  }, [themeName, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
