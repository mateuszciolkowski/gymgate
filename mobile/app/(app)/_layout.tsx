import { Stack } from "expo-router";

// Later: floating bottom bar, drawer and banners are rendered here (PLAN.md section 3).
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
