import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { MUSCLE_GROUPS } from "@/domain/muscleGroups";
import { fonts, useTheme } from "@/theme";
import { Icon, Modal } from "@/ui";

interface Props {
  value: string;
  /** Groups chosen in the other fields (not selectable here). */
  taken: string[];
  disabled?: boolean;
  testID: string;
  onChange: (value: string) => void;
}

/** Stand-in for the PWA's native <select>: a field that opens a list of the muscle groups. */
export function GroupSelect({ value, taken, disabled, testID, onChange }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const label = MUSCLE_GROUPS.find((g) => g.value === value)?.label ?? "-- Wybierz grupę --";
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: c.surface, borderColor: c.borderMed, opacity: disabled ? 0.5 : 1 }]}
      >
        <Text style={[styles.text, { color: c.text }]}>{label}</Text>
        <Icon name="chevronDown" size={14} color={c.text} />
      </Pressable>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Grupa mięśniowa">
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {[{ value: "", label: "-- Wybierz grupę --" }, ...MUSCLE_GROUPS].map((g) => {
            const off = g.value !== "" && g.value !== value && taken.includes(g.value);
            return (
              <Pressable
                key={g.value}
                accessibilityRole="button"
                accessibilityState={{ disabled: off, selected: g.value === value }}
                testID={`${testID}-${g.value || "none"}`}
                disabled={off}
                onPress={() => pick(g.value)}
                style={[styles.option, { borderBottomColor: c.border, opacity: off ? 0.35 : 1 }]}
              >
                <Text style={[styles.optionText, { color: g.value === value ? c.a2 : c.text }]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, minHeight: 50, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  text: { fontFamily: fonts.dmSans[400], fontSize: 14 },
  list: { maxHeight: 400 },
  option: { paddingVertical: 13, borderBottomWidth: 1 },
  optionText: { fontFamily: fonts.dmSans[500], fontSize: 14 },
});
