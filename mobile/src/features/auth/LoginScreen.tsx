import { useState } from "react";
import { View } from "react-native";
import { AuthField, AuthLayout, ErrorBanner, SubmitButton, SwitchFooter } from "./AuthParts";
import { validateLogin, type LoginField } from "./validation";

export interface LoginScreenProps {
  /** Resolves on success; rejects with an Error whose message is shown above the form. Wired by the session layer. */
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSubmit, onSwitchToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    const fieldErrors = validateLogin({ email, password });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setLoading(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd logowania");
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Zaloguj się do swojego konta" logoGap={32}>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={{ gap: 14 }}>
        <AuthField
          label="Email"
          testID="login-email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          editable={!loading}
          placeholder="twoj@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <AuthField
          label="Hasło"
          testID="login-password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          editable={!loading}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => void submit()}
        />
        <SubmitButton testID="login-submit" label={loading ? "Logowanie..." : "Zaloguj się"} loading={loading} onPress={() => void submit()} />
      </View>
      <SwitchFooter testID="login-to-register" text="Nie masz konta?" link="Zarejestruj się" onPress={onSwitchToRegister} />
    </AuthLayout>
  );
}
