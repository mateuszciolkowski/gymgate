import { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Button, Modal, showAlert } from "@/ui";

interface Props {
  isOpen: boolean;
  initialNotes: string | null | undefined;
  onClose: () => void;
  onSave: (notes: string) => void;
}

/** Modal "Notatki do treningu" (PWA WorkoutNotesModal). Opening always loads the current text. */
export function WorkoutNotesModal({ isOpen, initialNotes, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setNotes(initialNotes ?? "");
  }

  const save = () => {
    try {
      Keyboard.dismiss();
      onSave(notes.trim());
      onClose();
    } catch {
      showAlert("Nie udało się zapisać notatek");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notatki do treningu" subtitle="Sesja treningowa">
      <Text style={[styles.label, { color: c.textMuted }]}>Treść notatki</Text>
      <TextInput
        testID="workout-notes-input"
        value={notes}
        onChangeText={setNotes}
        placeholder="Wpisz uwagi ogólne do tego treningu..."
        placeholderTextColor={c.textMuted}
        selectionColor={c.a1}
        multiline
        autoFocus
        textAlignVertical="top"
        style={[styles.input, { color: c.text, backgroundColor: c.surface2, borderColor: c.borderMed }]}
      />
      <View style={[styles.buttons, { borderTopColor: c.border }]}>
        <Button variant="secondary" testID="workout-notes-cancel" onPress={onClose}>
          Anuluj
        </Button>
        <Button style={styles.grow} testID="workout-notes-save" onPress={save}>
          Zapisz notatki
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", marginBottom: 6 },
  input: { minHeight: 114, padding: 14, borderRadius: 12, borderWidth: 1, fontFamily: fonts.dmSans[400], fontSize: 14, lineHeight: 21 },
  grow: { flex: 1 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
});
