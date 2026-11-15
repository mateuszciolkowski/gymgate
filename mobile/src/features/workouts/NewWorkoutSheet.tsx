import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createWorkout } from "@/db/repositories";
import { useAction, useDb } from "@/providers";
import { fonts, pwaBarlow, toBoxShadow, useTheme } from "@/theme";
import { Icon, showAlert } from "@/ui";
import { nextWorkoutName, workoutDateIso } from "./newWorkout";
import { usePlansForNewWorkout } from "./queries";

const longDate = (d: Date) => d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

/** Bottom sheet "Nowy trening": creates the workout locally and opens it. */
export function NewWorkoutSheet() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const { userId } = useDb();
  const plans = usePlansForNewWorkout(userId);
  const today = new Date();
  const [name, setName] = useState("");
  const [gym, setGym] = useState("");
  const [day, setDay] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [dateOpen, setDateOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = plans.find((p) => p.id === planId);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/trainings"));

  const pickPlan = (id: string) => {
    setName((n) => nextWorkoutName(n, plans.find((p) => p.id === id), selected));
    setPlanId(id);
    setPlanOpen(false);
  };

  const openDate = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: day, mode: "date", maximumDate: today, onChange: (_e, d) => d && setDay(d) });
    } else {
      setDateOpen((v) => !v);
    }
  };

  const submit = () => {
    if (busy) return;
    setBusy(true);
    try {
      const w = act((ctx) =>
        createWorkout(ctx, {
          workoutDate: workoutDateIso(day),
          workoutName: name.trim() || undefined,
          gymName: gym.trim() || undefined,
          workoutPlanId: planId || undefined,
        }),
      );
      router.replace({ pathname: "/workout/[id]", params: { id: w.id } });
    } catch {
      showAlert("Błąd tworzenia treningu");
      setBusy(false);
    }
  };

  const input = [styles.input, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }];

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Zamknij" />
      <KeyboardAvoidingView behavior="padding" style={styles.avoid} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.surface, borderColor: c.borderMed, paddingBottom: 32 + Math.max(insets.bottom - 16, 0), boxShadow: toBoxShadow(theme.shadowElevated) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.surface3 }]} />
          <Text style={[styles.title, { color: c.text }]}>Nowy trening</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Wypełnij szczegóły i przejdź do sesji</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.form} contentContainerStyle={styles.formContent}>
            <Field label="Nazwa treningu" optional>
              <TextInput testID="workout-name" value={name} onChangeText={setName} placeholder="np. Klatka + Triceps" placeholderTextColor={c.textMuted} selectionColor={c.a1} style={input} />
            </Field>
            <Field label="Siłownia / Lokalizacja" optional>
              <TextInput testID="workout-gym" value={gym} onChangeText={setGym} placeholder="np. CityFit, Zdrofit" placeholderTextColor={c.textMuted} selectionColor={c.a1} style={input} />
            </Field>
            <Field label="Data treningu">
              <Pressable accessibilityRole="button" testID="workout-date" onPress={openDate} style={[input, styles.picker]}>
                <Text style={[styles.pickerText, { color: c.text }]}>{longDate(day)}</Text>
                <Icon name="calendar" color={c.textMuted} />
              </Pressable>
              {dateOpen && Platform.OS === "ios" ? (
                <DateTimePicker value={day} mode="date" display="inline" maximumDate={today} locale="pl-PL" themeVariant={theme.isDark ? "dark" : "light"} accentColor={c.a1} onChange={(_e, d) => d && setDay(d)} />
              ) : null}
            </Field>
            {plans.length > 0 ? (
              <Field label="Plan treningowy" optional>
                <Pressable
                  accessibilityRole="button"
                  testID="workout-plan"
                  onPress={() => setPlanOpen((v) => !v)}
                  style={[input, styles.picker, planOpen && { borderColor: c.a1 }]}
                >
                  <Text numberOfLines={1} style={[styles.pickerText, styles.shrink, { color: selected ? c.text : c.textMuted }]}>
                    {selected?.name ?? "Zacznij bez planu"}
                  </Text>
                  <View style={{ transform: [{ rotate: planOpen ? "180deg" : "0deg" }] }}>
                    <Icon name="chevronDown" size={14} color={c.textMuted} />
                  </View>
                </Pressable>
                {planOpen ? (
                  <View style={[styles.menu, { backgroundColor: c.surface2, borderColor: c.borderMed, boxShadow: toBoxShadow(theme.shadow) }]}>
                    <ScrollView nestedScrollEnabled style={styles.menuScroll}>
                      <Pressable onPress={() => pickPlan("")} style={[styles.option, { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                        <Text style={[styles.optionText, { color: planId === "" ? c.a2 : c.textMuted }]}>Zacznij bez planu</Text>
                        {planId === "" ? <Icon name="check" size={14} color={c.a2} /> : null}
                      </Pressable>
                      {plans.map((p) => (
                        <Pressable key={p.id} testID={`plan-option-${p.id}`} onPress={() => pickPlan(p.id)} style={styles.option}>
                          <View style={styles.optionName}>
                            <Text numberOfLines={1} style={[styles.optionText, styles.shrink, { color: planId === p.id ? c.a2 : c.text }]}>
                              {p.name}
                            </Text>
                            {p.isFavorite ? <Text style={[styles.badge, { backgroundColor: c.surface3, color: c.a1 }]}>★ Ulubione</Text> : null}
                          </View>
                          <Text style={[styles.planCount, { color: c.textMuted }]}>{p.items.length} ćw.</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </Field>
            ) : null}

            <View style={styles.buttons}>
              <Pressable accessibilityRole="button" testID="workout-cancel" disabled={busy} onPress={close} style={[styles.button, { backgroundColor: c.surface2, borderColor: c.border, borderWidth: 1 }]}>
                <Text style={[styles.buttonText, { color: c.textSub }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="workout-submit"
                disabled={busy}
                onPress={submit}
                style={[styles.button, { backgroundColor: c.btnBg, boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: "rgba(0,0,0,0.3)" }] }]}
              >
                <Text style={[styles.buttonText, { color: "#ffffff" }]}>{busy ? "Tworzenie…" : "Rozpocznij"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.label, { color: theme.colors.textSub }]}>
        {label}
        {optional ? <Text style={styles.optional}> (opcjonalnie)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.75)" },
  avoid: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingTop: 24, paddingHorizontal: 24 },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginBottom: 20 },
  title: { fontFamily: pwaBarlow[800], fontSize: 22, lineHeight: 33, letterSpacing: -0.33, marginBottom: 4 },
  subtitle: { fontFamily: fonts.dmSans[500], fontSize: 13, lineHeight: 19.5, marginBottom: 20 },
  form: { flexGrow: 0 },
  formContent: { gap: 16 },
  label: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", marginBottom: 6 },
  optional: { fontFamily: fonts.dmSans[400], fontSize: 10, textTransform: "none", letterSpacing: 0, opacity: 0.6 },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontFamily: fonts.dmSans[400], fontSize: 14 },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pickerText: { fontFamily: fonts.dmSans[400], fontSize: 14 },
  shrink: { flexShrink: 1 },
  menu: { marginTop: 6, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  menuScroll: { maxHeight: 208 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  optionName: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  optionText: { fontFamily: fonts.dmSans[400], fontSize: 13 },
  badge: { fontFamily: fonts.dmSans[700], fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  planCount: { fontFamily: "Menlo", fontSize: 11 },
  buttons: { flexDirection: "row", gap: 12, paddingTop: 12 },
  button: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
});
