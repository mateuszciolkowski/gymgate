import { Stack } from "expo-router";
import { useTheme } from "@/theme";
import { NavShell } from "@/ui/navigation/NavShell";

// Bar, drawer and (later) banners sit above the stack so they stay on every screen (D-09).
// `user` and `onLogout` are wired by the session layer (Etap 6).
export default function AppLayout() {
  const { theme } = useTheme();
  return (
    <NavShell>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
    </NavShell>
  );
}
