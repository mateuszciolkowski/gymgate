import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createPlan, getPlan, getProfile, updatePlan } from "@/db/repositories";
import type { Db } from "@/db/types";
import { groupLabel } from "@/domain/exerciseFilter";
import { MAX_PLAN_EXERCISES, draftFromPlan, planDraftError } from "@/domain/planDraft";
import { ValidationError } from "@/domain/validation";
import { useExercises } from "@/features/workouts/queries";
import { useAction, useDbQuery } from "@/providers";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Button, FormField, Icon, Switch, TextField } from "@/ui";
import { clearDraft, ensureDraft, updateDraft, usePlanDraft } from "./draftStore";
import { PlanHistoryModal } from "./PlanHistoryModal";
import { ReorderList, ROW_HEIGHT, moveItem } from "./ReorderList";

/** PWA PlanFormScreen: create (no `editId`) or edit a plan. The unsaved form lives in `draftStore`. */
export function PlanFormScreen({ editId }: { editId?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const editing = editId !== undefined;
  const key = editId ?? "new";
  const plan = useDbQuery(useCallback((db: Db) => (editId ? getPlan(db, editId) : null), [editId]));
  const isAdmin = useDbQuery(useCallback((db: Db) => getProfile(db)?.isAdmin ?? false, []));
  const exercises = useExercises();
  useState(() => ensureDraft(key, () => draftFromPlan(plan)));
  const draft = usePlanDraft(key);
  const set = (patch: Partial<typeof draft>) => updateDraft(key, (d) => ({ ...d, ...patch }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState(false);

  const back = () => {
    clearDraft();
    if (router.canGoBack()) router.back();
    else router.replace("/plans");
  };
  if (editing && !plan) return null;

  const submit = () => {
    Keyboard.dismiss();
    const creators = new Map(exercises.map((e) => [e.id, e.creatorUserId]));
    const invalid = planDraftError(draft, (id) => creators.get(id));
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      const base = {
        name: draft.name.trim(),
        shortName: draft.shortName.trim() || null,
        exerciseIds: draft.items.map((i) => i.exerciseId),
        isPublic: draft.isGlobal ? true : draft.isPublic,
      };
      if (plan) {
        // The server forces a plan public whenever `isGlobal` is sent, so only send it when the admin changed it.
        const globalChanged = isAdmin && draft.isGlobal !== (plan.creatorUserId === null);
        act((ctx) => updatePlan(ctx, plan.id, { ...base, ...(globalChanged && { isGlobal: draft.isGlobal }) }));
      } else {
        act((ctx) => createPlan(ctx, { ...base, isGlobal: isAdmin ? draft.isGlobal : undefined }));
      }
      back();
    } catch (e) {
      setBusy(false);
      setError(e instanceof ValidationError ? e.message : "Błąd zapisu planu");
    }
  };

  const openPicker = () => router.push({ pathname: "/exercise-picker", params: { planKey: key } });
  const move = (from: number, to: number) => updateDraft(key, (d) => ({ ...d, items: moveItem(d.items, from, to) }));

  return (
    <>
      <KeyboardAwareScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Wróć" testID="plan-form-back" onPress={back} style={[styles.back, { backgroundColor: c.surface2, borderColor: c.border }]}>
            <Icon name="chevronLeft" size={18} strokeWidth={2} color={c.text} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.overline, { color: c.textMuted }]}>{editing ? "Edycja" : "Nowy plan"}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
              {editing ? "Edytuj plan" : "Tworzenie planu"}
            </Text>
          </View>
          {editing ? (
            <Pressable accessibilityRole="button" testID="plan-history-open" onPress={() => setHistory(true)}>
              <Text style={[styles.link, { color: c.a1 }]}>Historia</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" testID="plan-form-cancel" onPress={back}>
            <Text style={[styles.link, { color: c.textMuted }]}>Anuluj</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.error, { borderColor: "rgba(239,68,68,0.25)" }]}>
            <Text testID="plan-error" style={[styles.errorText, { color: c.error }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <FormField label="Nazwa planu">
          <TextField testID="plan-name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="np. FBW Klatka Piersiowa" maxLength={100} editable={!busy} style={styles.field} />
        </FormField>
        <FormField label="Nazwa skrócona" optional hint="Wpisywana automatycznie jako nazwa treningu przy wyborze planu">
          <TextField testID="plan-short-name" value={draft.shortName} onChangeText={(shortName) => set({ shortName })} placeholder="np. FBW Trening A" maxLength={50} editable={!busy} style={styles.field} />
        </FormField>

        {isAdmin ? (
          <View style={styles.switch}>
            <Switch
              testID="plan-global"
              checked={draft.isGlobal}
              onChange={(isGlobal) => set({ isGlobal })}
              disabled={busy}
              variant="admin"
              badge="ADMIN"
              label="Globalny plan treningowy"
              description="Widoczny dla wszystkich użytkowników w zakładce „Built-in”"
            />
          </View>
        ) : null}
        {!draft.isGlobal ? (
          <View style={[styles.switch, { marginBottom: 20 }]}>
            <Switch testID="plan-public" checked={draft.isPublic} onChange={(isPublic) => set({ isPublic })} disabled={busy} variant="accent" label="Publiczny plan" description="Widoczny dla innych użytkowników" />
          </View>
        ) : null}

        <Text style={[styles.label, { color: c.textSub }]}>
          Ćwiczenia{" "}
          <Text testID="plan-count" style={[styles.count, { color: c.textMuted }]}>
            ({draft.items.length}/{MAX_PLAN_EXERCISES})
          </Text>
        </Text>

        <ReorderList
          items={draft.items}
          keyOf={(i) => i.exerciseId}
          onMove={move}
          renderRow={(item, index, handle) => (
            <View
              testID={`plan-row-${item.exerciseId}`}
              accessible={false}
              accessibilityActions={[
                { name: "decrement", label: "Przesuń wyżej" },
                { name: "increment", label: "Przesuń niżej" },
              ]}
              onAccessibilityAction={(e) => move(index, index + (e.nativeEvent.actionName === "decrement" ? -1 : 1))}
              style={[styles.row, { backgroundColor: c.surface2, borderColor: c.border }]}
            >
              {handle(
                <View accessible accessibilityLabel="Przeciągnij aby zmienić kolejność" testID={`plan-row-handle-${item.exerciseId}`} style={styles.grip}>
                  <Icon name="grip" color={c.textMuted} />
                </View>,
              )}
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.rowName, { color: c.text }]}>
                  {item.name}
                </Text>
                {item.muscleGroups.length > 0 ? (
                  <Text numberOfLines={1} style={[styles.rowGroups, { color: c.textMuted }]}>
                    {item.muscleGroups.map(groupLabel).join(", ")}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Usuń ćwiczenie z planu"
                testID={`plan-row-remove-${item.exerciseId}`}
                onPress={() => updateDraft(key, (d) => ({ ...d, items: d.items.filter((i) => i.exerciseId !== item.exerciseId) }))}
                style={styles.remove}
              >
                <Icon name="close" size={16} strokeWidth={2} color={c.textMuted} />
              </Pressable>
            </View>
          )}
        />

        {draft.items.length < MAX_PLAN_EXERCISES ? (
          <Pressable accessibilityRole="button" testID="plan-add-exercise" onPress={openPicker} style={[styles.add, { borderColor: c.borderMed }]}>
            <Icon name="plusLines" size={16} strokeWidth={2.5} color={c.textMuted} />
            <Text style={[styles.addText, { color: c.textMuted }]}>Dodaj ćwiczenie</Text>
          </Pressable>
        ) : null}

        <Button testID="plan-submit" size="lg" fullWidth loading={busy} loadingText="Zapisywanie..." onPress={submit} style={styles.submit}>
          {editing ? "Zapisz zmiany" : "Zapisz plan"}
        </Button>
      </KeyboardAwareScrollView>
      {history && editId ? <PlanHistoryModal planId={editId} onClose={() => setHistory(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 112, width: "100%", maxWidth: 672, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  flex: { flex: 1, minWidth: 0 },
  back: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  overline: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 1.32, textTransform: "uppercase" },
  title: { fontFamily: pwaBarlow[900], fontSize: 28, lineHeight: 28, letterSpacing: -0.56, marginTop: 2 },
  link: { fontFamily: fonts.dmSans[500], fontSize: 14, lineHeight: 21 },
  error: { borderRadius: 12, borderWidth: 1.5, backgroundColor: "rgba(239,68,68,0.12)", paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  errorText: { fontFamily: fonts.dmSans[500], fontSize: 13, lineHeight: 19.5 },
  field: { borderWidth: 1.5, fontSize: 14 },
  switch: { marginBottom: 16 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18, letterSpacing: 0.72, textTransform: "uppercase", marginBottom: 8 },
  count: { fontFamily: fonts.dmSans[400], textTransform: "none", letterSpacing: 0 },
  row: { height: ROW_HEIGHT - 8, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  grip: { width: 28, height: 44, alignItems: "center", justifyContent: "center" },
  rowName: { fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 18 },
  rowGroups: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5, marginTop: 2 },
  remove: { padding: 8 },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", marginTop: 0 },
  addText: { fontFamily: fonts.dmSans[500], fontSize: 14 },
  submit: { marginTop: 24 },
});
