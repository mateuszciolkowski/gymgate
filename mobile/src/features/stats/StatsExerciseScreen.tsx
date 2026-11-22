import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fmtListDate } from "@/domain/formatters";
import { recentPoints } from "@/domain/stats";
import type { StrengthMetric } from "@/domain/strengthMetrics";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { Icon, useBarClearance } from "@/ui";
import { useExerciseHistory } from "./queries";
import { StatsProgressChart } from "./StatsProgressChart";

const METRICS: Array<{ key: StrengthMetric; button: string; label: string }> = [
  { key: "weight", button: "Ciężar", label: "Ciężar podnoszony w czasie" },
  { key: "e1rm", button: "1RM", label: "Szac. 1RM w czasie" },
  { key: "volume", button: "Objętość", label: "Objętość w czasie" },
];

/** Exercise history (PWA StatsExerciseDetailScreen): five tiles, progress chart, last sessions. */
export function StatsExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const clearance = useBarClearance();
  const router = useRouter();
  const { stat, name, points, summaries, series, e1rm } = useExerciseHistory(exerciseId);
  const [metric, setMetric] = useState<StrengthMetric>("weight");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const recent = recentPoints(points, order);
  const shadow = toBoxShadow(theme.shadow);

  const cards = [
    { label: "Maks. ciężar", value: `${stat?.maxWeight ?? "0"} kg`, hi: true },
    { label: "Szac. 1RM", value: `${e1rm} kg` },
    { label: "Powt. przy PR", value: String(stat?.maxWeightReps ?? 0) },
    { label: "Sesje", value: String(stat?.totalWorkouts ?? 0) },
    { label: "Ostatnio", value: `${stat?.lastWeight ?? "0"} kg × ${stat?.lastReps ?? 0}`, wide: true },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: clearance },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          testID="stats-back"
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: c.surface2 }]}
        >
          <Icon name="chevronLeft" size={18} strokeWidth={2} color={c.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.overline, { color: c.textMuted }]}>Historia ćwiczenia</Text>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.title, { color: c.text }]}
          >
            {name ?? "Szczegóły ćwiczenia"}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.card,
              card.wide && styles.cardWide,
              { backgroundColor: c.surface, borderColor: c.border, boxShadow: shadow },
            ]}
          >
            <Text style={[styles.cardLabel, { color: c.textMuted }]}>{card.label}</Text>
            <Text style={[styles.cardValue, { color: card.hi ? c.a2 : c.text }, tabularNums]}>
              {card.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.chart}>
        <View style={[styles.sort, styles.metricSwitch, { backgroundColor: c.surface2 }]}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === m.key }}
              testID={`stats-metric-${m.key}`}
              onPress={() => setMetric(m.key)}
              style={[styles.sortBtn, styles.metricBtn, metric === m.key && { backgroundColor: c.a1 }]}
            >
              <Text style={[styles.sortText, { color: metric === m.key ? "#ffffff" : c.textMuted }]}>{m.button}</Text>
            </Pressable>
          ))}
        </View>
        <StatsProgressChart
          points={series[metric]}
          label={METRICS.find((m) => m.key === metric)!.label}
          height={180}
        />
      </View>

      <View
        style={[
          styles.table,
          { backgroundColor: c.surface, borderColor: c.border, boxShadow: shadow },
        ]}
      >
        <View style={[styles.tableHead, { borderBottomColor: c.border }]}>
          <Text style={[styles.tableTitle, { color: c.textMuted }]}>Ostatnie sesje</Text>
          <View style={[styles.sort, { backgroundColor: c.surface2 }]}>
            {(["desc", "asc"] as const).map((dir) => (
              <Pressable
                key={dir}
                accessibilityRole="button"
                accessibilityState={{ selected: order === dir }}
                testID={`stats-order-${dir}`}
                onPress={() => setOrder(dir)}
                style={[styles.sortBtn, order === dir && { backgroundColor: c.a1 }]}
              >
                <Text style={[styles.sortText, { color: order === dir ? "#ffffff" : c.textMuted }]}>
                  {dir === "desc" ? "Najnowsze" : "Najstarsze"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {recent.length === 0 ? (
          <Text style={[styles.none, { color: c.textMuted }]}>
            Brak historii dla tego ćwiczenia.
          </Text>
        ) : (
          recent.map((p, i) => (
            <View
              key={p.workoutId}
              testID="stats-session"
              style={[styles.session, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
            >
              <Text style={[styles.sessionDate, { color: c.textMuted }]}>
                {fmtListDate(p.workoutDate)}
              </Text>
              <Text style={[styles.sessionSets, { color: c.text }, tabularNums]}>
                {summaries.get(p.workoutId) ?? `${p.maxSetWeight} kg × ${p.repetitionsAtMaxSet}`}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, width: "100%", maxWidth: 672, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minWidth: 0 },
  overline: {
    fontFamily: fonts.dmSans[700],
    fontSize: 11,
    lineHeight: 16.5,
    letterSpacing: 0.55,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: { fontFamily: pwaBarlow[700], fontSize: 20, lineHeight: 25 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: { width: "48.5%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  cardLabel: {
    fontFamily: fonts.dmSans[700],
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardValue: { fontFamily: pwaBarlow[900], fontSize: 20, lineHeight: 25 },
  cardWide: { width: "100%" },
  chart: { marginBottom: 16 },
  metricSwitch: { marginBottom: 8 },
  metricBtn: { flex: 1, alignItems: "center", paddingVertical: 6 },
  table: { borderRadius: 16, borderWidth: 1, marginBottom: 24, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableTitle: {
    fontFamily: fonts.dmSans[700],
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sort: { flexDirection: "row", padding: 2, borderRadius: 8 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sortText: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5 },
  none: {
    fontFamily: fonts.dmSans[400],
    fontSize: 13,
    lineHeight: 19.5,
    textAlign: "center",
    paddingVertical: 24,
  },
  session: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionDate: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 18 },
  sessionSets: {
    flex: 1,
    textAlign: "right",
    fontFamily: fonts.dmSans[700],
    fontSize: 13,
    lineHeight: 19.5,
  },
});
