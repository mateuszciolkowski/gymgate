import { Redirect, Stack } from "expo-router";
import { useActiveWorkout, useInitialPullDone } from "@/features/workouts/queries";
import { AbandonedWorkoutDialog } from "@/features/workouts/AbandonedWorkoutDialog";
import { ContinuePill } from "@/features/workouts/ContinuePill";
import { logoutWithPrompt } from "@/features/auth";
import { DownloadScreen } from "@/features/sync/DownloadScreen";
import { StatusFrame } from "@/features/sync/StatusFrame";
import { useDbOptional, useSession } from "@/providers";
import { useTheme } from "@/theme";
import { chooseLogout, showAlert } from "@/ui";
import { NavShell } from "@/ui/navigation/NavShell";

// Bar, drawer and banners sit above the stack so they stay on every screen (D-09).
export default function AppLayout() {
  const { state } = useSession();
  const db = useDbOptional();
  if (state.status === "signedOut" || !db) return <Redirect href="/login" />;
  return <Gate />;
}

/** Until the first snapshot is stored the app shows "pobieranie danych" instead of an empty app. */
function Gate() {
  const { state } = useSession();
  const pulled = useInitialPullDone();
  return !pulled && state.status === "active" ? <DownloadScreen /> : <Shell />;
}

function Shell() {
  const { theme } = useTheme();
  const { state, logout } = useSession();
  const active = useActiveWorkout();
  const user = state.user ? { firstName: state.user.firstName, lastName: state.user.lastName, email: state.user.email } : null;
  const onLogout = () => logoutWithPrompt(logout, chooseLogout).catch(() => showAlert("Nie udało się wylogować"));
  return (
    <NavShell user={user} onLogout={() => void onLogout()} workoutPill={active ? <ContinuePill workout={active} /> : undefined}>
      <StatusFrame>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
          <Stack.Screen name="workout-new" options={{ presentation: "transparentModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "transparent" } }} />
          <Stack.Screen name="exercise-picker" options={{ presentation: "transparentModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "transparent" } }} />
        </Stack>
      </StatusFrame>
      {active ? <AbandonedWorkoutDialog workout={active} /> : null}
    </NavShell>
  );
}
