import { StyleSheet, Text, View } from "react-native";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { EmptyState, Icon, ScreenContainer } from "@/ui";

/**
 * Trainings tab. Only the empty state exists so far; the list, the in-progress section and the sort toggle
 * come with Etap 9. Metrics are the PWA fallbacks without data: 0 workouts, "–" sets.
 */
export function TrainingsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.overline, { color: c.textMuted }]}>Dziennik treningowy</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Treningi
        </Text>
      </View>

      <View style={[styles.activity, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}>
        <View style={styles.metrics}>
          <View>
            <Text style={[styles.metricLabel, { color: c.textMuted }]}>Ten rok</Text>
            <Text style={[styles.metricLine, tabularNums]}>
              <Text style={[styles.metricValue, { color: c.text }]}>0</Text>
              <Text style={[styles.metricUnit, { color: c.textMuted }]}> treningów</Text>
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View>
            <Text style={[styles.metricLabel, { color: c.textMuted }]}>Wykonano</Text>
            <Text style={[styles.metricLine, tabularNums]}>
              <Text style={[styles.metricValue, { color: c.a2 }]}>–</Text>
              <Text style={[styles.metricUnit, { color: c.textMuted }]}> serii</Text>
            </Text>
          </View>
        </View>
        <Text style={[styles.tag, { backgroundColor: c.tagBg, color: c.tagText }]}>Aktywność</Text>
      </View>

      <View style={styles.historyHeader}>
        <Text style={[styles.historyLabel, { color: c.textMuted }]}>Historia sesji</Text>
        <Text style={[styles.count, { backgroundColor: c.surface2, color: c.textSub }, tabularNums]}>0</Text>
      </View>

      <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.borderMed }]}>
        <EmptyState
          title="Brak ukończonych treningów"
          description="Rozpocznij swój pierwszy trening, klikając przycisk powyżej."
          icon={<Icon name="emptyHistory" color={c.textMuted} />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  overline: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 1.32, textTransform: "uppercase", marginBottom: 2 },
  title: { fontFamily: pwaBarlow[800], fontSize: 30, lineHeight: 30, letterSpacing: -0.75 },
  activity: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metrics: { flexDirection: "row", alignItems: "center", gap: 16 },
  metricLabel: { fontFamily: fonts.dmSans[700], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase" },
  metricLine: { fontSize: 13, lineHeight: 24 },
  metricValue: { fontFamily: fonts.dmSans[700], fontSize: 16 },
  metricUnit: { fontFamily: fonts.dmSans[400], fontSize: 11 },
  divider: { width: 1, height: 28 },
  tag: { fontFamily: fonts.dmSans[700], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  historyLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase" },
  count: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  empty: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", padding: 32 },
});
