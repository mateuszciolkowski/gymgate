import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { validateSet, ValidationError } from "@/domain/validation";
import { fonts, pwaBarlow, tabularNums, useTheme } from "@/theme";
import { Icon } from "@/ui";

/** Weight as typed ("62,5" on a Polish keyboard) to a number; empty means 0 (PWA). */
export const parseWeight = (text: string): number => (text.trim() === "" ? 0 : Number(text.replace(",", ".")));

interface SetEditorProps {
  setNumber: number;
  initialWeight: string;
  initialReps: string;
  testIDPrefix: string;
  onConfirm: (weight: number, reps: number) => void;
  onCancel: () => void;
}

/** Inline editor of one set: used for the new-set draft and for editing a saved set (PWA DraftSetRow / SetRowEditable). */
export function SetEditor({ setNumber, initialWeight, initialReps, testIDPrefix, onConfirm, onCancel }: SetEditorProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const w = parseWeight(weight);
    const r = reps.trim() === "" ? NaN : Number(reps);
    try {
      validateSet(w, r);
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : "Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)");
      return;
    }
    onConfirm(w, r);
  };

  const input = [styles.input, tabularNums, { backgroundColor: c.surface, borderColor: c.borderMed, color: c.text }];
  return (
    <View style={[styles.root, { backgroundColor: c.surface2, borderColor: c.a1 }]}>
      <View style={styles.row}>
        <Text style={[styles.number, { color: c.a2 }]}>#{setNumber}</Text>
        <View style={styles.column}>
          <Text style={[styles.label, { color: c.textMuted }]}>Ciężar (kg)</Text>
          <TextInput
            testID={`${testIDPrefix}-weight`}
            value={weight}
            onChangeText={(t) => {
              setWeight(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.textMuted}
            selectionColor={c.a1}
            selectTextOnFocus
            autoFocus
            style={input}
          />
        </View>
        <Text style={[styles.times, { color: c.text }]}>×</Text>
        <View style={styles.column}>
          <Text style={[styles.label, { color: c.textMuted }]}>Powtórzenia</Text>
          <TextInput
            testID={`${testIDPrefix}-reps`}
            value={reps}
            onChangeText={(t) => {
              setReps(t);
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={c.textMuted}
            selectionColor={c.a1}
            selectTextOnFocus
            style={input}
          />
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zapisz serię"
            testID={`${testIDPrefix}-confirm`}
            onPress={confirm}
            style={[styles.confirm, { backgroundColor: c.btnBg }]}
          >
            <Icon name="check" size={17} strokeWidth={2.5} color="#ffffff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anuluj"
            testID={`${testIDPrefix}-cancel`}
            onPress={onCancel}
            style={[styles.cancel, { backgroundColor: c.surface3 }]}
          >
            <Icon name="close" size={14} strokeWidth={2} color={c.textMuted} />
          </Pressable>
        </View>
      </View>
      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: 12, borderWidth: 1.5, padding: 10, gap: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  number: { width: 24, textAlign: "center", fontFamily: "Menlo", fontWeight: "700", fontSize: 13, paddingTop: 30 },
  column: { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center", marginBottom: 4 },
  input: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12, borderWidth: 1, textAlign: "center", fontFamily: pwaBarlow[800], fontSize: 18, minHeight: 44 },
  times: { fontFamily: fonts.dmSans[700], fontSize: 14, opacity: 0.4, paddingTop: 30 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 19 },
  confirm: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancel: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 16.5, textAlign: "center" },
});
