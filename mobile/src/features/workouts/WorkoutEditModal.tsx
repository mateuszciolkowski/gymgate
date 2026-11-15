import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { durationBetween, fmtTotal, hhmm, initialTimes, movedWorkoutDate } from "@/domain/workoutEdit";
import type { Workout } from "@/domain/types";
import { fonts, tabularNums, useTheme } from "@/theme";
import { Button, FormField, Modal, showAlert } from "@/ui";
import { PickerField } from "./PickerField";

export interface WorkoutDetailsPatch {
  workoutName: string;
  gymName: string;
  workoutDate: string;
  durationSeconds?: number;
}

interface Props {
  isOpen: boolean;
  workout: Workout;
  onClose: () => void;
  onSave: (patch: WorkoutDetailsPatch) => void;
}

const longDate = (d: Date) => d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
const atTime = (hm: string): Date => {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

/** Modal "Szczegóły treningu" (PWA WorkoutEditModal). Fields can be cleared (D-23); completed workouts also edit start/end. */
export function WorkoutEditModal({ isOpen, workout, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const completed = workout.status === "COMPLETED";
  const load = () => ({
    name: workout.workoutName ?? "",
    gym: workout.gymName ?? "",
    day: new Date(workout.workoutDate),
    ...initialTimes(workout.createdAt, workout.durationSeconds),
  });
  const [form, setForm] = useState(load);
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setForm(load());
  }
  const today = new Date();
  const total = durationBetween(form.start, form.end);

  const save = () => {
    try {
      onSave({
        workoutName: form.name.trim(),
        gymName: form.gym.trim(),
        workoutDate: movedWorkoutDate(workout.workoutDate, form.day),
        ...(completed && { durationSeconds: total }),
      });
      onClose();
    } catch {
      showAlert("Nie udało się zapisać zmian");
    }
  };

  const input = [styles.input, { backgroundColor: c.surface2, borderColor: c.borderMed, color: c.text }];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Szczegóły treningu" subtitle={completed ? "Zakończony trening" : "Aktywny trening"}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
        <FormField label="Nazwa treningu">
          <TextInput testID="edit-name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="Nazwa treningu" placeholderTextColor={c.textMuted} selectionColor={c.a1} style={input} />
        </FormField>
        <FormField label="Siłownia" optional>
          <TextInput testID="edit-gym" value={form.gym} onChangeText={(gym) => setForm((f) => ({ ...f, gym }))} placeholder="Nazwa siłowni" placeholderTextColor={c.textMuted} selectionColor={c.a1} style={input} />
        </FormField>
        <FormField label="Data treningu">
          <PickerField mode="date" testID="edit-date" value={form.day} label={longDate(form.day)} maximumDate={today} onChange={(day) => setForm((f) => ({ ...f, day }))} />
        </FormField>

        {completed ? (
          <View style={[styles.times, { borderTopColor: c.border }]}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Czas trwania sesji</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={[styles.timeLabel, { color: c.textMuted }]}>Rozpoczęcie</Text>
                <PickerField mode="time" testID="edit-start" value={atTime(form.start)} label={form.start} onChange={(d) => setForm((f) => ({ ...f, start: hhmm(d) }))} />
              </View>
              <View style={styles.timeCol}>
                <Text style={[styles.timeLabel, { color: c.textMuted }]}>Zakończenie</Text>
                <PickerField mode="time" testID="edit-end" value={atTime(form.end)} label={form.end} onChange={(d) => setForm((f) => ({ ...f, end: hhmm(d) }))} />
              </View>
            </View>
            <Text testID="edit-total" style={[styles.total, tabularNums, { color: c.a2 }]}>
              Czas całkowity: {fmtTotal(total)}
            </Text>
          </View>
        ) : null}

        <View style={[styles.buttons, { borderTopColor: c.border }]}>
          <Button variant="secondary" testID="edit-cancel" onPress={onClose}>
            Anuluj
          </Button>
          <Button style={styles.grow} testID="edit-save" onPress={save}>
            Zapisz zmiany
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontFamily: fonts.dmSans[400], fontSize: 14 },
  times: { borderTopWidth: 1, paddingTop: 12, marginBottom: 4 },
  sectionLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", marginBottom: 8 },
  timeRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1, minWidth: 0 },
  timeLabel: { fontFamily: fonts.dmSans[500], fontSize: 10, lineHeight: 15, marginBottom: 4 },
  total: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18, marginTop: 8 },
  grow: { flex: 1 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
});
