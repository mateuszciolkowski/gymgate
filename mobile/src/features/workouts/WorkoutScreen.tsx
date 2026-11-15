import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addItem, addSet, completeWorkout, deleteItem, deleteSet, deleteWorkout, skipPlanExercise, updateItemNotes, updateSet, updateWorkout } from "@/db/repositories";
import { fmtDate, fmtDuration, fmtTimer } from "@/domain/formatters";
import { nextFromPlan, remainingFromPlan } from "@/domain/planNext";
import { completionError } from "@/domain/validation";
import { useAction } from "@/providers";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { confirmAlert, Icon, LoadingBlock, showAlert } from "@/ui";
import { useWorkoutElapsed, useWorkoutScreen } from "./queries";
import { PlanBanner } from "./PlanBanner";
import { WorkoutEditModal } from "./WorkoutEditModal";
import { WorkoutItemCard } from "./WorkoutItemCard";
import { WorkoutNotesModal } from "./WorkoutNotesModal";

/** Workout screen (PWA WorkoutDetailScreen). DRAFT: timer, add exercise, sets, finish. COMPLETED: read-only. */
export function WorkoutScreen({ id }: { id: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const { workout, plan, previous, stats } = useWorkoutScreen(id);
  const elapsed = useWorkoutElapsed(workout?.status === "DRAFT" ? workout : null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      const added = workout.items.find((i) => !known.current?.has(i.id));
      if (added) {
        setExpanded(added.id);
        setFresh(added.id);
      }
    }
    known.current = ids;
  }, [workout]);

  if (!workout) return <LoadingBlock />;
  const isCompleted = workout.status === "COMPLETED";
  const items = [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout);
  const canEdit = !isCompleted || editMode;

  const added = items.map((i) => i.exerciseId);
  const skipped = workout.skippedPlanExerciseIds ?? [];
  const next = nextFromPlan(plan, added, skipped);
  const nextName = next ? (plan?.items.find((i) => i.exerciseId === next.exerciseId)?.exercise.name ?? "") : null;
  const planTotal = plan?.items.length ?? 0;
  const planDone = planTotal - remainingFromPlan(plan, added, skipped);

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
        <View style={styles.topRight}>
          {isCompleted ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Edytuj szczegóły treningu" testID="workout-details" onPress={() => setDetailsOpen(true)} style={[styles.iconButton, { backgroundColor: c.surface2 }]}>
              <Icon name="calendar" size={15} color={c.textSub} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isCompleted ? (editMode ? "Zakończ edycję ćwiczeń" : "Edytuj ćwiczenia") : "Edytuj szczegóły treningu"}
            testID="workout-edit"
            onPress={() => (isCompleted ? setEditMode((v) => !v) : setDetailsOpen(true))}
            style={[styles.iconButton, { backgroundColor: editMode ? c.a1 : c.surface2 }]}
          >
            <Icon name={isCompleted && editMode ? "check" : "pencil"} size={15} strokeWidth={isCompleted && editMode ? 2.5 : 2} color={editMode ? "#ffffff" : c.textSub} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Usuń trening" testID="workout-delete" onPress={() => void remove()} style={[styles.iconButton, { backgroundColor: c.surface2 }]}>
            <Icon name="bin" color={c.textMuted} />
          </Pressable>
        </View>
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
          {workout.workoutNotes ? (
            <Pressable testID="workout-notes-card" onPress={() => setNotesOpen(true)} style={[styles.summaryNotes, { borderTopColor: c.border }]}>
              <Text style={[styles.notesLabel, { color: c.textMuted }]}>Notatki</Text>
              <Text style={[styles.notesText, { color: c.text }]}>{workout.workoutNotes}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={[styles.timerCard, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}>
            <View style={styles.timerLeft}>
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
            <View style={styles.timerRight}>
              <Pressable accessibilityRole="button" testID="workout-notes" onPress={() => setNotesOpen(true)} style={[styles.notesButton, { backgroundColor: c.surface2 }]}>
                <Icon name="notes" size={13} color={c.textSub} />
                <Text style={[styles.notesButtonText, { color: c.textSub }]}>Notatki</Text>
              </Pressable>
              {plan ? (
                <Text testID="plan-progress" style={[styles.planProgress, tabularNums, { backgroundColor: c.activeBg, borderColor: c.activeBorder, color: c.activeBorder }]}>
                  Plan {planDone}/{planTotal}
                </Text>
              ) : null}
            </View>
          </View>

          {workout.workoutNotes ? (
            <Pressable testID="workout-notes-card" onPress={() => setNotesOpen(true)} style={[styles.notesCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.notesLabel, { color: c.textMuted }]}>Notatki do treningu</Text>
              <Text style={[styles.notesText, { color: c.text }]}>{workout.workoutNotes}</Text>
            </Pressable>
          ) : null}

          {plan ? (
            <PlanBanner
              nextName={nextName}
              onAdd={() => next && act((ctx) => addItem(ctx, id, next.exerciseId))}
              onSkip={() => {
                try {
                  if (next) act((ctx) => skipPlanExercise(ctx, id, next.exerciseId));
                } catch {
                  // silent, as in the PWA
                }
              }}
            />
          ) : null}

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

      {isCompleted && editMode ? (
        <Pressable
          accessibilityRole="button"
          testID="add-exercise"
          onPress={() => router.push({ pathname: "/exercise-picker", params: { workoutId: id } })}
          style={[styles.action, styles.addWide, { backgroundColor: c.surface, borderColor: c.borderMed, borderWidth: 1 }]}
        >
          <Icon name="plusLines" size={15} strokeWidth={2.5} color={c.text} />
          <Text style={[styles.actionText, { color: c.text }]}>Dodaj ćwiczenie</Text>
        </Pressable>
      ) : null}

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
              canEdit={canEdit}
              isExpanded={expanded === item.id}
              autoDraft={fresh === item.id}
              stats={stats.get(item.exerciseId)}
              lastSetsSummary={previous.latestSetsByExerciseId.get(item.exerciseId)}
              previousSets={previous.previousSetsByExerciseId.get(item.exerciseId)}
              onToggle={(itemId) => {
                setFresh(null);
                setExpanded((cur) => (cur === itemId ? null : itemId));
              }}
              onAddSet={(itemId, data) => act((ctx) => addSet(ctx, itemId, data))}
              onUpdateSet={(setId, data) => act((ctx) => updateSet(ctx, setId, data))}
              onDeleteSet={(setId) => act((ctx) => deleteSet(ctx, setId))}
              onDeleteItem={(itemId) => act((ctx) => deleteItem(ctx, itemId))}
              onUpdateNotes={(itemId, notes) => act((ctx) => updateItemNotes(ctx, itemId, notes))}
            />
          ))
        )}
      </View>
      <WorkoutNotesModal
        isOpen={notesOpen}
        initialNotes={workout.workoutNotes}
        onClose={() => setNotesOpen(false)}
        onSave={(notes) => act((ctx) => updateWorkout(ctx, id, { workoutNotes: notes }))}
      />
      <WorkoutEditModal isOpen={detailsOpen} workout={workout} onClose={() => setDetailsOpen(false)} onSave={(patch) => act((ctx) => updateWorkout(ctx, id, patch))} />
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
  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  timerCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  timerLeft: { flexShrink: 1 },
  timerRight: { gap: 8, flexShrink: 0 },
  notesButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  notesButtonText: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18 },
  planProgress: { textAlign: "center", fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  notesCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  summaryNotes: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  notesLabel: { fontFamily: fonts.dmSans[700], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  notesText: { fontFamily: fonts.dmSans[500], fontSize: 13, lineHeight: 21 },
  addWide: { flex: 0, alignSelf: "stretch", marginBottom: 16 },
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
