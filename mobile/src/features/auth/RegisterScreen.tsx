import { useState } from "react";
import { View } from "react-native";
import { AuthField, AuthLayout, ErrorBanner, SubmitButton, SwitchFooter } from "./AuthParts";
import { validateRegister, type RegisterField } from "./validation";

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterScreenProps {
  /** Resolves on success; rejects with an Error whose message is shown above the form. Wired by the session layer. */
  onSubmit: (data: RegisterData) => Promise<void>;
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSubmit, onSwitchToLogin }: RegisterScreenProps) {
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: RegisterField) => (text: string) => setV((prev) => ({ ...prev, [key]: text }));

  const submit = async () => {
    setError("");
    const result = validateRegister(v);
    setErrors(result.fields);
    if (Object.keys(result.fields).length > 0) return;
    if (result.form) {
      setError(result.form);
      return;
    }
    setLoading(true);
    try {
      const phone = v.phone.trim();
      await onSubmit({
        email: v.email.trim(),
        password: v.password,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phone: phone || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji");
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Stwórz nowe konto" logoGap={28}>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AuthField label="Imię" testID="register-firstName" value={v.firstName} onChangeText={set("firstName")} error={errors.firstName} editable={!loading} placeholder="Jan" autoComplete="given-name" />
          </View>
          <View style={{ flex: 1 }}>
            <AuthField label="Nazwisko" testID="register-lastName" value={v.lastName} onChangeText={set("lastName")} error={errors.lastName} editable={!loading} placeholder="Kowalski" autoComplete="family-name" />
          </View>
        </View>
        <AuthField label="Email" testID="register-email" value={v.email} onChangeText={set("email")} error={errors.email} editable={!loading} placeholder="twoj@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
        <AuthField label="Telefon (opcjonalnie)" testID="register-phone" value={v.phone} onChangeText={set("phone")} error={errors.phone} editable={!loading} placeholder="+48 123 456 789" keyboardType="phone-pad" autoComplete="tel" />
        <AuthField label="Hasło" testID="register-password" value={v.password} onChangeText={set("password")} error={errors.password} editable={!loading} placeholder="Min. 6 znaków" secureTextEntry autoComplete="new-password" />
        <AuthField label="Potwierdź hasło" testID="register-confirmPassword" value={v.confirmPassword} onChangeText={set("confirmPassword")} error={errors.confirmPassword} editable={!loading} placeholder="Powtórz hasło" secureTextEntry autoComplete="new-password" onSubmitEditing={() => void submit()} />
        <SubmitButton testID="register-submit" label={loading ? "Tworzenie konta..." : "Zarejestruj się"} loading={loading} onPress={() => void submit()} />
      </View>
      <SwitchFooter testID="register-to-login" text="Masz już konto?" link="Zaloguj się" onPress={onSwitchToLogin} />
    </AuthLayout>
  );
}
