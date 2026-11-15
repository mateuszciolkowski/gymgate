import type { THEME_NAMES } from "./themes.generated";

export type ThemeName = (typeof THEME_NAMES)[number];

export interface BoxShadow {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadRadius: number;
  color: string;
}

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderMed: string;
  borderStrong: string;
  text: string;
  textSub: string;
  textMuted: string;
  a1: string;
  a2: string;
  btnBg: string;
  btnHover: string;
  tagBg: string;
  tagText: string;
  recordBg: string;
  recordText: string;
  navBg: string;
  activeBorder: string;
  activeGlow: string;
  activeBg: string;
  error: string;
  /** --gg-glow resolved from color-mix (btnBg at 35%). */
  glow: string;
}

export interface Theme {
  name: ThemeName;
  isDark: boolean;
  colors: ThemeColors;
  /** --gg-grad-btn as expo-linear-gradient props. */
  gradBtn: {
    colors: readonly [string, string];
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  shadow: readonly BoxShadow[];
  shadowElevated: readonly BoxShadow[];
}
