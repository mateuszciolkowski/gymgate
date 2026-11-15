import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fmtTimer } from "@/domain/formatters";
import type { Workout } from "@/domain/types";
import { tabularNums, useTheme } from "@/theme";
import { Icon, PulseDot } from "@/ui";
import { useWorkoutElapsed } from "./queries";

/** Bottom-bar pill "Kontynuuj trening" with the running timer: the same function as the workout screen (D-16). */
export function ContinuePill({ workout }: { workout: Workout }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const elapsed = useWorkoutElapsed(workout);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kontynuuj trening"
      testID="bar-continue-workout"
      onPress={() => router.navigate({ pathname: "/workout/[id]", params: { id: workout.id } })}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: c.surface2, borderColor: c.a1, transform: [{ scale: pressed ? 0.95 : 1 }], boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, color: "rgba(0,0,0,0.3)" }] },
      ]}
    >
      <PulseDot color={c.a1} />
      <Text testID="bar-timer" style={[styles.timer, tabularNums, { color: c.a2 }]}>
        {fmtTimer(elapsed)}
      </Text>
      <View style={[styles.go, { backgroundColor: c.btnBg }]}>
        <Icon name="chevronRight" size={11} strokeWidth={3} color="#ffffff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, paddingLeft: 14, paddingRight: 8, paddingVertical: 6, minHeight: 44 },
  timer: { fontFamily: "Menlo", fontWeight: "700", fontSize: 14, minWidth: 48, textAlign: "center" },
  go: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
