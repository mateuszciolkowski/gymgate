import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { addItem } from "@/db/repositories";
import { appendToDraft, getDraft } from "@/features/plans/draftStore";
import { useExercises, useWorkout } from "@/features/workouts/queries";
import { useAction } from "@/providers";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Icon } from "@/ui";
import { ExerciseList } from "./ExerciseList";

/**
 * Bottom sheet "Wybierz ćwiczenie" (PWA ExerciseSelectionModal + ExerciseList in select mode). Adds the pick to a workout
 * (`workoutId`) or to the plan form draft (`planKey`).
 */
export function ExercisePickerSheet({ workoutId, planKey }: { workoutId?: string; planKey?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const act = useAction();
  const workout = useWorkout(workoutId ?? "");
  const all = useExercises();
  // The plan draft cannot change while this sheet is open, so reading it once is enough.
  const added = useMemo(
    () => new Set(planKey ? getDraft(planKey)?.items.map((i) => i.exerciseId) : workout?.items.map((i) => i.exerciseId)),
    [planKey, workout],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace(planKey ? "/plans" : "/trainings"));
  const select = (exerciseId: string) => {
    if (planKey) {
      const exercise = all.find((e) => e.id === exerciseId);
      if (exercise) appendToDraft(planKey, exercise);
    } else if (workoutId) {
      act((ctx) => addItem(ctx, workoutId, exerciseId));
    }
    close();
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Zamknij" />
      <View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.borderMed, boxShadow: [{ offsetX: 0, offsetY: -8, blurRadius: 40, color: "rgba(0,0,0,0.6)" }] }]}
      >
        <View style={[styles.top, { borderBottomColor: c.border }]}>
          <View style={[styles.handle, { backgroundColor: c.surface3 }]} />
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
              Wybierz ćwiczenie
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Zamknij" testID="picker-close" onPress={close} style={[styles.close, { backgroundColor: c.surface2 }]}>
              <Icon name="close" size={15} strokeWidth={2} color={c.text} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            testID="picker-new-exercise"
            onPress={() => router.replace({ pathname: "/exercise-new", params: planKey ? { planKey } : { workoutId } })}
            style={[styles.newButton, { backgroundColor: c.btnBg }]}
          >
            <Icon name="plusLines" size={17} strokeWidth={2.5} color="#ffffff" />
            <Text style={styles.newButtonText}>Dodaj nowe ćwiczenie</Text>
          </Pressable>
        </View>

        <ExerciseList mode="select" excludeIds={added} onSelect={select} bottomPadding={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: { height: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1.5, overflow: "hidden" },
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  newButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 15 },
  newButtonText: { fontFamily: fonts.dmSans[700], fontSize: 14, color: "#ffffff" },
  title: { fontFamily: pwaBarlow[900], fontSize: 24, lineHeight: 32 },
  close: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
