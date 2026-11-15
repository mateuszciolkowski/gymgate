import { Redirect, Stack } from "expo-router";
import { useSession } from "@/providers";

// "reauthRequired" keeps the login screens reachable (the app stays usable meanwhile); an active session leaves them.
export default function AuthLayout() {
  const { state } = useSession();
  if (state.status === "active") return <Redirect href="/trainings" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
