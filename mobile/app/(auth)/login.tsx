import { useRouter } from "expo-router";
import { authenticate, LoginScreen, switchPrompt } from "@/features/auth";
import { useSession } from "@/providers";
import { confirmAlert } from "@/ui";

export default function Login() {
  const router = useRouter();
  const { login } = useSession();
  const submit = (email: string, password: string) =>
    authenticate(
      (o) => login(email, password, o),
      (pending) => confirmAlert(switchPrompt(pending), "Zaloguj"),
      "Nieprawidłowy email lub hasło",
    );
  return <LoginScreen onSubmit={submit} onSwitchToRegister={() => router.replace("/register")} />;
}
