import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { completeWorkout, getWorkout } from "@/db/repositories";
import type { Workout } from "@/domain/types";
import { abandonedDurationSeconds, computeWorkoutLastActivity, fmtAgo, STALE_WORKOUT_MS } from "@/domain/workoutTimer";
import { useAction, useDb } from "@/providers";
import { getClockOffset } from "@/sync/clock";
import { fonts, useTheme } from "@/theme";
import { Button, Icon } from "@/ui";

/**
 * "Trening się skończył?" (PWA StaleWorkoutDialog): once per workout and app launch, when the active workout had no
 * activity for over 2 h. "Zakończ trening" skips the completion rules (D-24) and records last activity - start.
 */
export function AbandonedWorkoutDialog({ workout }: { workout: Workout }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { db } = useDb();
  const act = useAction();
  const [launchedAt] = useState(() => Date.now());
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState<{ id: string; name: string | null; agoMs: number } | null>(null);

  // Once per workout and app launch (state, not a ref: derived during render, safe under StrictMode).
  if (!checked.has(workout.id)) {
    setChecked(new Set(checked).add(workout.id));
    const agoMs = launchedAt + getClockOffset(db) - computeWorkoutLastActivity(workout);
    if (agoMs > STALE_WORKOUT_MS) setShown({ id: workout.id, name: workout.workoutName ?? null, agoMs });
  }

  const finish = () => {
    if (!shown) return;
    try {
      // Current data, not the snapshot taken when the dialog opened.
      const current = getWorkout(db, shown.id) ?? workout;
      act((ctx) => completeWorkout(ctx, shown.id, abandonedDurationSeconds(current), { force: true }));
      setShown(null);
    } catch {
      // Keep the dialog so it can be retried.
    }
  };

  return (
    <Modal visible={shown !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShown(null)}>
      <View style={styles.backdrop}>
        <View testID="abandoned-dialog" style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.head}>
            <View style={[styles.icon, { backgroundColor: c.activeBg, borderColor: c.activeBorder }]}>
              <Icon name="clock" size={16} strokeWidth={2.2} color={c.activeBorder} />
            </View>
            <View style={styles.titles}>
              <Text style={[styles.title, { color: c.text }]}>Trening się skończył?</Text>
              <Text style={[styles.sub, { color: c.textMuted }]}>Ostatnia aktywność {fmtAgo(shown?.agoMs ?? 0)} temu</Text>
            </View>
          </View>
          {shown?.name ? <Text style={[styles.name, { color: c.textSub }]}>{shown.name}</Text> : null}
          <View style={styles.buttons}>
            <Button variant="secondary" size="sm" style={styles.grow} testID="abandoned-continue" onPress={() => setShown(null)}>
              Kontynuuj
            </Button>
            <Button size="sm" style={styles.grow} testID="abandoned-finish" onPress={finish}>
              Zakończ trening
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 16, paddingBottom: 32 },
  card: { width: "100%", maxWidth: 384, borderRadius: 22, borderWidth: 1.5, padding: 20, boxShadow: [{ offsetX: 0, offsetY: 16, blurRadius: 48, color: "rgba(0,0,0,0.5)" }] },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  titles: { flex: 1 },
  title: { fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  sub: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18 },
  name: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, marginBottom: 12 },
  buttons: { flexDirection: "row", gap: 8, marginTop: 4 },
  grow: { flex: 1 },
});
