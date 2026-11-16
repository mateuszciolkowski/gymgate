import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Button, FormField, Modal, TextField } from "@/ui";
import { deleteAccountError } from "./settingsActions";

/** Account deletion (D4): needs the password; wrong password or no network keeps the dialog open with a message. */
export function DeleteAccountModal({ isOpen, pending, onClose, onConfirm }: { isOpen: boolean; pending: number; onClose: () => void; onConfirm: (password: string) => Promise<void> }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setPassword("");
    setError("");
    onClose();
  };
  const submit = async () => {
    if (!password) return setError("Wpisz hasło, aby potwierdzić.");
    setBusy(true);
    setError("");
    try {
      await onConfirm(password);
    } catch (e) {
      setError(deleteAccountError(e));
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Usuń konto" subtitle="Tej operacji nie można cofnąć">
      <Text style={[styles.text, { color: c.textSub }]}>
        Konto i wszystkie Twoje dane (treningi, własne ćwiczenia, plany, statystyki) zostaną trwale usunięte z serwera i z tego urządzenia.
        {pending > 0 ? ` Niewysłane zmiany (${pending}) przepadną.` : ""} Wymaga połączenia z internetem.
      </Text>
      <View style={styles.form}>
        <FormField label="Hasło" error={error || null}>
          <TextField
            testID="delete-password"
            value={password}
            onChangeText={setPassword}
            invalid={!!error}
            editable={!busy}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void submit()}
          />
        </FormField>
        <View style={styles.buttons}>
          <Button variant="secondary" onPress={close} disabled={busy} testID="delete-cancel" style={styles.flex}>
            Anuluj
          </Button>
          <Button variant="danger" onPress={() => void submit()} loading={busy} loadingText="Usuwanie..." testID="delete-confirm" style={styles.flex}>
            Usuń konto
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  form: { marginTop: 16, gap: 16 },
  buttons: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
