import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteExercise, exerciseDeleteImpact, type ExerciseRow } from "@/db/repositories";
import { useAction, useDb } from "@/providers";
import { Icon, confirmAlert, showAlert } from "@/ui";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { ExerciseList } from "./ExerciseList";

/** PWA confirm text plus what the cascade takes with it (D-10). */
export function deleteMessage(name: string, impact: { workouts: number; plans: number }): string {
  const base = `Czy na pewno chcesz usunąć ćwiczenie "${name}"?`;
  if (impact.workouts + impact.plans === 0) return base;
  return `${base}\n\nZniknie też z historii: treningi: ${impact.workouts}, plany: ${impact.plans}.`;
}

/** Exercises tab (PWA ExercisesScreen). */
export function ExercisesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const { db } = useDb();

  const remove = async (e: ExerciseRow) => {
    if (!(await confirmAlert(deleteMessage(e.name, exerciseDeleteImpact(db, e.id)), "Usuń"))) return;
    try {
      act((ctx) => deleteExercise(ctx, e.id));
    } catch {
      showAlert("Błąd podczas usuwania ćwiczenia");
    }
  };

  return (
    <ExerciseList
      mode="manage"
      header={
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View>
            <Text style={[styles.overline, { color: c.textMuted }]}>Twoja baza</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
              Ćwiczenia
            </Text>
          </View>
          <Pressable accessibilityRole="button" testID="exercise-add" onPress={() => router.push("/exercise-new")} style={[styles.add, { backgroundColor: c.btnBg }]}>
            <Icon name="plusLines" size={15} strokeWidth={2.5} color="#ffffff" />
            <Text style={styles.addText}>Nowe ćwiczenie</Text>
          </Pressable>
        </View>
      }
      onEdit={(e) => router.push({ pathname: "/exercise-edit", params: { id: e.id } })}
      onDelete={(e) => void remove(e)}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  overline: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 1.32, textTransform: "uppercase", marginBottom: 2 },
  add: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addText: { fontFamily: fonts.dmSans[700], fontSize: 13, color: "#ffffff" },
  title: { fontFamily: pwaBarlow[800], fontSize: 30, lineHeight: 38, letterSpacing: -0.75 },
});
