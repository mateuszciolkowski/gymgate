import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Icon } from "@/ui";

interface Props {
  /** Name of the next plan exercise, or null when every plan exercise is added or skipped. */
  nextName: string | null;
  onAdd: () => void;
  onSkip: () => void;
}

/** "Kolejne z planu" banner with "Pomiń", or the "all added" indicator (PWA WorkoutDetailScreen). */
export function PlanBanner({ nextName, onAdd, onSkip }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (nextName === null) {
    return (
      <View testID="plan-completed" style={[styles.done, { backgroundColor: c.activeBg, borderColor: c.activeBorder }]}>
        <Icon name="check" size={14} strokeWidth={2.5} color={c.activeBorder} />
        <Text style={[styles.doneText, { color: c.activeBorder }]}>Wszystkie ćwiczenia z planu zostały dodane</Text>
      </View>
    );
  }
  return (
    <View style={[styles.banner, { borderColor: c.activeBorder, backgroundColor: c.surface }]}>
      <Pressable accessibilityRole="button" testID="plan-add-next" onPress={onAdd} style={styles.add}>
        <Text style={[styles.badge, { backgroundColor: c.activeBg, color: c.activeBorder }]}>Kolejne z planu</Text>
        <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
          {nextName}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" testID="plan-skip" onPress={onSkip} style={[styles.skip, { backgroundColor: c.surface2, borderLeftColor: c.border }]}>
        <Icon name="skip" size={13} strokeWidth={2.5} color={c.textMuted} />
        <Text style={[styles.skipText, { color: c.textMuted }]}>Pomiń</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  add: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  badge: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, textTransform: "uppercase", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  name: { flexShrink: 1, fontFamily: fonts.dmSans[700], fontSize: 14, lineHeight: 21 },
  skip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderLeftWidth: 1 },
  skipText: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18 },
  done: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
  doneText: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18 },
});
