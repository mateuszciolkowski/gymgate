import type { ThemeName } from "@/theme";

export interface ThemeOption {
  id: ThemeName;
  label: string;
  desc: string;
  /** Preview colours exactly as hard-coded in frontend/src/features/menu/components/MenuScreen.tsx. */
  bg: string;
  accent: string;
  dot1: string;
  dot2: string;
  isDark: boolean;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: "dark", label: "Ciemny", desc: "Emerald Dark", bg: "#090E0D", accent: "#111918", dot1: "#059669", dot2: "#34D399", isDark: true },
  { id: "steel", label: "Stalowy", desc: "Steel Blue", bg: "#06090F", accent: "#0C1220", dot1: "#3B82F6", dot2: "#93C5FD", isDark: true },
  { id: "graphite", label: "Grafitowy", desc: "Graphite Dark", bg: "#0A0A0C", accent: "#1A1A1F", dot1: "#6B7280", dot2: "#CBD5E1", isDark: true },
  { id: "violet", label: "Fioletowy", desc: "Violet Dark", bg: "#0C0812", accent: "#160F22", dot1: "#A855F7", dot2: "#F0ABFC", isDark: true },
  { id: "ember", label: "Bursztynowy", desc: "Ember Dark", bg: "#100B07", accent: "#1C140C", dot1: "#F59E0B", dot2: "#FBBF24", isDark: true },
  { id: "crimson", label: "Karmazynowy", desc: "Crimson Dark", bg: "#110808", accent: "#1E1010", dot1: "#EF4444", dot2: "#F87171", isDark: true },
  { id: "light", label: "Jasny", desc: "Emerald Light", bg: "#EBEFEC", accent: "#F5F8F6", dot1: "#059669", dot2: "#34D399", isDark: false },
  { id: "blossom", label: "Różany", desc: "Blossom Light", bg: "#EFE8F2", accent: "#F8F4FA", dot1: "#9333EA", dot2: "#EC4899", isDark: false },
  { id: "sky", label: "Niebieski", desc: "Sky Light", bg: "#E6EDF4", accent: "#F2F6FA", dot1: "#2563EB", dot2: "#93C5FD", isDark: false },
  { id: "sand", label: "Piaskowy", desc: "Sand Light", bg: "#F1E9D9", accent: "#F9F4EA", dot1: "#D97706", dot2: "#F59E0B", isDark: false },
  { id: "sage", label: "Szałwiowy", desc: "Sage Light", bg: "#E6EDE4", accent: "#F1F6EF", dot1: "#16A34A", dot2: "#4ADE80", isDark: false },
  { id: "slate", label: "Grafitowy jasny", desc: "Slate Light", bg: "#E4E7EB", accent: "#EFF1F4", dot1: "#475569", dot2: "#64748B", isDark: false },
];
