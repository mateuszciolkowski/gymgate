import { useRouter } from "expo-router";
import { authenticate, RegisterScreen, switchPrompt } from "@/features/auth";
import { useSession } from "@/providers";
import { confirmAlert } from "@/ui";

export default function Register() {
  const router = useRouter();
  const { register } = useSession();
  const submit = (data: Parameters<typeof register>[0]) =>
    authenticate((o) => register(data, o), (pending) => confirmAlert(switchPrompt(pending), "Zarejestruj"), "Błąd rejestracji");
  return <RegisterScreen onSubmit={submit} onSwitchToLogin={() => router.replace("/login")} />;
}
