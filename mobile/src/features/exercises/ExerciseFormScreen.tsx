import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addItem,
  createExercise,
  getExercise,
  getProfile,
  updateExercise,
} from "@/db/repositories";
import type { Db } from "@/db/types";
import { MUSCLE_GROUPS } from "@/domain/muscleGroups";
import { ValidationError } from "@/domain/validation";
import { appendToDraft } from "@/features/plans/draftStore";
import { useAction, useDbQuery } from "@/providers";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Button, FormField, Icon, Switch, TextField, useBarClearance } from "@/ui";
import { GroupSelect } from "./GroupSelect";

interface Props {
  /** Edit mode: the exercise to edit. */
  editId?: string;
  /** Create mode, opened from the workout picker: the new exercise is also added to this workout. */
  workoutId?: string;
  /** Create mode, opened from the plan form picker: the new exercise is also added to that plan draft. */
  planKey?: string;
}

/** PWA AddExerciseScreen / EditExerciseScreen in one form. */
export function ExerciseFormScreen({ editId, workoutId, planKey }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const clearance = useBarClearance();
  const router = useRouter();
  const act = useAction();
  const editing = editId !== undefined;
  const existing = useDbQuery(
    useCallback((db: Db) => (editId ? getExercise(db, editId) : null), [editId]),
  );
  const isAdmin = useDbQuery(useCallback((db: Db) => getProfile(db)?.isAdmin ?? false, []));

  const [name, setName] = useState(existing?.name ?? "");
  const [groups, setGroups] = useState<string[]>(
    existing?.muscleGroups.length ? existing.muscleGroups : [""],
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isGlobal, setIsGlobal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/exercises"));
  if (editing && !existing) return null;

  const setGroup = (i: number, v: string) => setGroups((g) => g.map((x, j) => (j === i ? v : x)));

  const submit = () => {
    Keyboard.dismiss();
    const valid = groups.filter((g) => g.trim() !== "");
    if (editing) {
      if (!name.trim() || valid.length === 0)
        return setError("Wypełnij nazwę i wybierz przynajmniej jedną grupę mięśniową");
    } else {
      if (!name.trim()) return setError("Nazwa ćwiczenia jest wymagana");
      if (valid.length === 0) return setError("Wybierz przynajmniej jedną grupę mięśniową");
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        // D-23: an emptied description clears the field (the PWA cannot).
        act((ctx) =>
          updateExercise(ctx, editId, {
            name,
            muscleGroups: valid,
            description: description.trim() || null,
          }),
        );
      } else {
        const created = act((ctx) =>
          createExercise(ctx, {
            name,
            muscleGroups: valid,
            description: description.trim() || undefined,
            isGlobal: isAdmin ? isGlobal : undefined,
          }),
        );
        if (workoutId) act((ctx) => addItem(ctx, workoutId, created.id));
        if (planKey) appendToDraft(planKey, created);
      }
      back();
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof ValidationError
          ? e.message
          : editing
            ? "Błąd aktualizacji ćwiczenia"
            : "Błąd podczas dodawania ćwiczenia",
      );
    }
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={120} // keeps the submit button under the focused field in view
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: clearance },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          testID="exercise-form-back"
          onPress={back}
          style={[styles.back, { backgroundColor: c.surface2, borderColor: c.border }]}
        >
          <Icon name="chevronLeft" size={18} strokeWidth={2} color={c.text} />
        </Pressable>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
            {editing ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {editing ? existing?.name : "Dodaj ćwiczenie do swojej bazy"}
          </Text>
        </View>
      </View>

      <FormField label="Nazwa ćwiczenia">
        <TextField
          testID="exercise-name"
          value={name}
          onChangeText={setName}
          placeholder="np. Wyciskanie sztangi"
          autoCorrect={false}
          editable={!busy}
          style={styles.field}
        />
      </FormField>

      <FormField label="Grupy mięśniowe">
        <View style={styles.groups}>
          {groups.map((g, i) => (
            <View key={i} style={styles.groupRow}>
              <GroupSelect
                testID={`exercise-group-select-${i}`}
                value={g}
                taken={groups}
                disabled={busy}
                onChange={(v) => setGroup(i, v)}
              />
              {groups.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Usuń grupę"
                  testID={`exercise-group-remove-${i}`}
                  disabled={busy}
                  onPress={() => setGroups((x) => x.filter((_, j) => j !== i))}
                  style={[styles.remove, { backgroundColor: c.surface, borderColor: c.borderMed }]}
                >
                  <Icon name="bin" size={13} strokeWidth={1.5} color={c.error} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
        {groups.length < MUSCLE_GROUPS.length ? (
          <Pressable
            accessibilityRole="button"
            testID="exercise-group-add"
            disabled={busy}
            onPress={() => setGroups((x) => [...x, ""])}
          >
            <Text style={[styles.addGroup, { color: c.a2 }]}>+ Dodaj grupę mięśniową</Text>
          </Pressable>
        ) : null}
      </FormField>

      <FormField label="Opis" optional>
        <TextField
          testID="exercise-description"
          value={description}
          onChangeText={setDescription}
          placeholder="Dodaj opis ćwiczenia..."
          autoCorrect={false}
          editable={!busy}
          multiline
          textAlignVertical="top"
          style={[styles.field, styles.textarea]}
        />
      </FormField>

      {isAdmin && !editing ? (
        <View style={styles.switch}>
          <Switch
            checked={isGlobal}
            onChange={setIsGlobal}
            disabled={busy}
            variant="admin"
            badge="ADMIN"
            label="Globalne ćwiczenie"
            description="Widoczne dla wszystkich użytkowników aplikacji"
            icon={<Icon name="globe" color={isGlobal ? c.a2 : c.textMuted} />}
          />
        </View>
      ) : null}

      {error ? (
        <View style={[styles.error, { borderColor: "rgba(239,68,68,0.25)" }]}>
          <Text testID="exercise-error" style={[styles.errorText, { color: c.error }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        testID="exercise-submit"
        size="lg"
        fullWidth
        loading={busy}
        loadingText={editing ? "Zapisywanie..." : "Dodawanie..."}
        onPress={submit}
        style={styles.submit}
      >
        {editing ? "Zapisz zmiany" : "Dodaj ćwiczenie"}
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, width: "100%", maxWidth: 672, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  flex: { flex: 1 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: pwaBarlow[900], fontSize: 28, lineHeight: 28, letterSpacing: -0.56 },
  subtitle: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18, marginTop: 2 },
  field: { borderWidth: 1.5, fontSize: 14 },
  textarea: { minHeight: 94 },
  groups: { gap: 8 },
  groupRow: { flexDirection: "row", gap: 8 },
  remove: {
    width: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  addGroup: { fontFamily: fonts.dmSans[600], fontSize: 13, lineHeight: 19.5, marginTop: 8 },
  switch: { marginBottom: 16 },
  error: {
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(239,68,68,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  submit: { marginTop: 8 },
});
