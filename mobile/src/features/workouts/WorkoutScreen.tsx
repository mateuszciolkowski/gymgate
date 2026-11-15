import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeWorkout, deleteItem, deleteSet, deleteWorkout, addSet, updateSet } from "@/db/repositories";
import { fmtDate, fmtDuration, fmtTimer } from "@/domain/formatters";
import { completionError } from "@/domain/validation";
import { useAction } from "@/providers";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { confirmAlert, Icon, LoadingBlock, showAlert } from "@/ui";
import { useWorkoutElapsed, useWorkoutScreen } from "./queries";
import { WorkoutItemCard } from "./WorkoutItemCard";

/** Workout screen (PWA WorkoutDetailScreen). DRAFT: timer, add exercise, sets, finish. COMPLETED: read-only. */
export function WorkoutScreen({ id }: { id: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const { workout, previous, stats } = useWorkoutScreen(id);
  const elapsed = useWorkoutElapsed(workout?.status === "DRAFT" ? workout : null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const leaving = useRef(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/trainings"));

  // The workout vanished (deleted elsewhere): back to the list.
  useEffect(() => {
    if (!workout && !leaving.current) router.replace("/trainings");
  }, [workout, router]);

  // A newly added exercise opens by itself (and with it its pre-filled draft set).
  useEffect(() => {
    if (!workout) return;
    const ids = new Set(workout.items.map((i) => i.id));
    if (known.current) {
      const fresh = workout.items.find((i) => !known.current?.has(i.id));
      if (fresh) setExpanded(fresh.id);
    }
    known.current = ids;
  }, [workout]);

  if (!workout) return <LoadingBlock />;
  const isCompleted = workout.status === "COMPLETED";
  const items = [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout);

  const remove = async () => {
    if (!(await confirmAlert("Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć.", "Usuń"))) return;
    try {
      leaving.current = true;
      act((ctx) => deleteWorkout(ctx, id));
      goBack();
    } catch {
      leaving.current = false;
      showAlert("Nie udało się usunąć treningu");
    }
  };

  const finish = () => {
    const problem = completionError(workout);
    if (problem) return showAlert(problem);
    try {
      act((ctx) => completeWorkout(ctx, id, elapsed));
      leaving.current = true;
      goBack();
    } catch {
      showAlert("Nie udało się zapisać treningu");
    }
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Pressable accessibilityRole="button" accessibilityLabel="Wróć" testID="workout-back" onPress={goBack} style={[styles.iconButton, { backgroundColor: c.surface2 }]}>
            <Icon name="chevronLeft" size={18} strokeWidth={2.5} color={c.textSub} />
          </Pressable>
          <View style={styles.titles}>
            <Text numberOfLines={1} accessibilityRole="header" style={[styles.title, { color: c.text }]}>
              {workout.workoutName || "Trening"}
            </Text>
            <Text style={[styles.date, { color: c.textMuted }]}>{fmtDate(workout.workoutDate)}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Usuń trening" testID="workout-delete" onPress={() => void remove()} style={[styles.iconButton, { backgroundColor: c.surface2 }]}>
          <Icon name="bin" color={c.textMuted} />
        </Pressable>
      </View>

      {isCompleted ? (
        <View style={[styles.summary, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]} testID="workout-summary">
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Czas treningu</Text>
            <Text style={[styles.summaryDuration, tabularNums, { color: c.a2 }]}>{fmtDuration(workout.durationSeconds)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Data i godzina</Text>
            <Text style={[styles.summaryValue, tabularNums, { color: c.text }]}>{fmtDate(workout.workoutDate)}</Text>
          </View>
          {workout.gymName ? (
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Siłownia</Text>
              <Text style={[styles.summaryValue, { color: c.text }]}>{workout.gymName}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <View style={[styles.timerCard, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}>
            <Text style={[styles.timerLabel, { color: c.textMuted }]}>Czas trwania</Text>
            <Text testID="workout-timer" style={[styles.timer, tabularNums, { color: c.text }]}>
              {fmtTimer(elapsed)}
            </Text>
            {workout.gymName ? (
              <View style={styles.gymRow}>
                <Text style={[styles.gym, { backgroundColor: c.surface2, color: c.textSub }]}>{workout.gymName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              testID="add-exercise"
              onPress={() => router.push({ pathname: "/exercise-picker", params: { workoutId: id } })}
              style={[styles.action, { backgroundColor: c.surface, borderColor: c.borderMed, borderWidth: 1 }]}
            >
              <Icon name="plusLines" size={15} strokeWidth={2.5} color={c.text} />
              <Text style={[styles.actionText, { color: c.text }]}>Dodaj ćwiczenie</Text>
            </Pressable>
            <Pressable accessibilityRole="button" testID="finish-workout" onPress={finish} style={[styles.action, { backgroundColor: c.btnBg }]}>
              <Icon name="check" size={15} strokeWidth={2.5} color="#ffffff" />
              <Text style={[styles.actionText, { color: "#ffffff" }]}>Zakończ trening</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={[styles.none, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.noneTitle, { color: c.text }]}>Brak ćwiczeń w tej sesji</Text>
            {!isCompleted ? <Text style={[styles.noneHint, { color: c.textMuted }]}>Kliknij przycisk „Dodaj ćwiczenie” powyżej</Text> : null}
          </View>
        ) : (
          items.map((item, index) => (
            <WorkoutItemCard
              key={item.id}
              item={item}
              number={index + 1}
              canEdit={!isCompleted}
              isExpanded={expanded === item.id}
              stats={stats.get(item.exerciseId)}
              lastSetsSummary={previous.latestSetsByExerciseId.get(item.exerciseId)}
              previousSets={previous.previousSetsByExerciseId.get(item.exerciseId)}
              onToggle={(itemId) => setExpanded((cur) => (cur === itemId ? null : itemId))}
              onAddSet={(itemId, data) => act((ctx) => addSet(ctx, itemId, data))}
              onUpdateSet={(setId, data) => act((ctx) => updateSet(ctx, setId, data))}
              onDeleteSet={(setId) => act((ctx) => deleteSet(ctx, setId))}
              onDeleteItem={(itemId) => act((ctx) => deleteItem(ctx, itemId))}
            />
          ))
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 112 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  topLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  titles: { flex: 1, minWidth: 0 },
  iconButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: pwaBarlow[800], fontSize: 20, lineHeight: 28, letterSpacing: -0.5 },
  date: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 18 },
  timerCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  timerLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", marginBottom: 4 },
  timer: { fontFamily: pwaBarlow[900], fontSize: 44, lineHeight: 44, letterSpacing: -1.1 },
  gymRow: { flexDirection: "row", marginTop: 8 },
  gym: { fontFamily: fonts.dmSans[600], fontSize: 12, lineHeight: 18, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  summary: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  summaryDuration: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  summaryValue: { fontFamily: fonts.dmSans[600], fontSize: 13, lineHeight: 19.5 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  action: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 12 },
  actionText: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  list: { gap: 12 },
  none: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed" },
  noneTitle: { fontFamily: fonts.dmSans[700], fontSize: 15, lineHeight: 22.5, marginBottom: 4 },
  noneHint: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center" },
});
