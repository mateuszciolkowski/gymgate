import { useRouter } from "expo-router";
import { LoginScreen } from "@/features/auth";

// The session layer (Etap 6) replaces this stub; until then submitting reports that it is not wired.
const notWired = () => Promise.reject(new Error("Logowanie nie jest jeszcze dostępne w tej wersji apki"));

export default function Login() {
  const router = useRouter();
  return <LoginScreen onSubmit={notWired} onSwitchToRegister={() => router.replace("/register")} />;
}
