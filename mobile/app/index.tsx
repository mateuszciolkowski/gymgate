import { Redirect } from "expo-router";
import { useSession } from "@/providers";

export default function Index() {
  const { state } = useSession();
  return <Redirect href={state.status === "signedOut" ? "/login" : "/trainings"} />;
}
