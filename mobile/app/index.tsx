import { Redirect } from "expo-router";

// Skeleton: no session guard yet (Etap 5/6). Boot straight into the tabs.
export default function Index() {
  return <Redirect href="/trainings" />;
}
