import { useRouter } from "expo-router";
import { RegisterScreen } from "@/features/auth";

// The session layer (Etap 6) replaces this stub; until then submitting reports that it is not wired.
const notWired = () => Promise.reject(new Error("Rejestracja nie jest jeszcze dostępna w tej wersji apki"));

export default function Register() {
  const router = useRouter();
  return <RegisterScreen onSubmit={notWired} onSwitchToLogin={() => router.replace("/login")} />;
}
