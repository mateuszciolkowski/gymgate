import { useIsFocused, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { Icon, useBarClearance } from "@/ui";
import type { IconName } from "@/ui/icons";
import { useStats } from "./queries";

const fmtKg = (w: string) => Number(w).toLocaleString("pl-PL");

/** Statistics tab (PWA StatsScreen): overview tiles, records / current toggle, list of exercises. */
export function StatsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const clearance = useBarClearance();
  const router = useRouter();
  const { overview, stats, current, names } = useStats(useIsFocused());
  const [showCurrent, setShowCurrent] = useState(false);

  const list = useMemo(
    () =>
      showCurrent
        ? [...stats].sort(
            (a, b) =>
              Number(current.get(b.exerciseId)?.weight ?? 0) -
              Number(current.get(a.exerciseId)?.weight ?? 0),
          )
        : stats,
    [stats, current, showCurrent],
  );
  const cards: Array<{ label: string; value: number; sub: string; icon: IconName; hi?: boolean }> =
    [
      {
        label: "Miesiąc",
        value: overview.workoutsLastMonth,
        sub: "treningów",
        icon: "statFlame",
        hi: true,
      },
      { label: "Ten rok", value: overview.workoutsLastYear, sub: "treningów", icon: "statBars" },
      { label: "Łącznie", value: overview.totalSets, sub: "wykonanych serii", icon: "statLines" },
    ];
  const shadow = toBoxShadow(theme.shadow);

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
        <Text style={[styles.overline, { color: c.textMuted }]}>Twoje postępy</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Statystyki
        </Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.label}
            testID={`stat-card-${card.label}`}
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border, boxShadow: shadow },
            ]}
          >
            <View style={styles.cardTop}>
              <Text numberOfLines={1} style={[styles.cardLabel, { color: c.textMuted }]}>
                {card.label}
              </Text>
              <View style={[styles.iconBox, { backgroundColor: card.hi ? c.tagBg : c.surface2 }]}>
                <Icon name={card.icon} size={15} color={card.hi ? c.a2 : c.textSub} />
              </View>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.cardValue, { color: card.hi ? c.a2 : c.text }, tabularNums]}
            >
              {card.value}
            </Text>
            <Text numberOfLines={1} style={[styles.cardSub, { color: c.textMuted }]}>
              {card.sub}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleTitle, { color: c.text }]}>
          {showCurrent ? "Aktualne obciążenia" : "Rekordy osobiste (PR)"}
        </Text>
        <View style={[styles.toggle, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {([false, true] as const).map((cur) => (
            <Pressable
              key={String(cur)}
              accessibilityRole="button"
              accessibilityState={{ selected: showCurrent === cur }}
              testID={cur ? "stats-mode-current" : "stats-mode-records"}
              onPress={() => setShowCurrent(cur)}
              style={[
                styles.toggleBtn,
                showCurrent === cur && {
                  backgroundColor: c.surface,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                },
              ]}
            >
              <Text
                style={[styles.toggleText, { color: showCurrent === cur ? c.text : c.textMuted }]}
              >
                {cur ? "Aktualne" : "Rekordy"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {list.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Brak statystyk. Zakończ pierwszy trening, aby zobaczyć rekordy.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((s) => {
            const cur = current.get(s.exerciseId);
            const hasData = !showCurrent || !!cur;
            const weight = showCurrent ? (cur ? fmtKg(cur.weight) : "—") : fmtKg(s.maxWeight);
            return (
              <Pressable
                key={s.exerciseId}
                accessibilityRole="button"
                testID={`stat-row-${s.exerciseId}`}
                onPress={() =>
                  router.push({ pathname: "/stats-exercise", params: { id: s.exerciseId } })
                }
                style={[
                  styles.row,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    boxShadow: shadow,
                    opacity: hasData ? 1 : 0.5,
                  },
                ]}
              >
                <Text numberOfLines={1} style={[styles.rowName, { color: c.text }]}>
                  {names.get(s.exerciseId) ?? "Ćwiczenie"}
                </Text>
                <View style={styles.rowRight}>
                  <Text
                    style={[styles.rowWeight, { color: showCurrent ? c.text : c.a2 }, tabularNums]}
                  >
                    {weight} kg
                  </Text>
                  <View style={[styles.chevron, { backgroundColor: c.surface2 }]}>
                    <Icon name="chevronRight" size={12} strokeWidth={2.5} color={c.textMuted} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, width: "100%", maxWidth: 672, alignSelf: "center" },
  header: { marginBottom: 24 },
  overline: {
    fontFamily: fonts.dmSans[700],
    fontSize: 11,
    lineHeight: 16.5,
    letterSpacing: 1.32,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: pwaBarlow[800], fontSize: 32, lineHeight: 32, letterSpacing: -0.8 },
  grid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  card: { flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardLabel: {
    flexShrink: 1,
    paddingRight: 4,
    fontFamily: fonts.dmSans[700],
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: { fontFamily: pwaBarlow[900], fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
  cardSub: { fontFamily: fonts.dmSans[500], fontSize: 10, lineHeight: 15, marginTop: 2 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  toggleTitle: {
    flexShrink: 1,
    fontFamily: fonts.dmSans[700],
    fontSize: 13,
    lineHeight: 19.5,
    letterSpacing: -0.13,
  },
  toggle: { flexDirection: "row", padding: 2, borderRadius: 12, borderWidth: 1 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  toggleText: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5 },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  rowName: {
    flex: 1,
    paddingRight: 12,
    fontFamily: fonts.dmSans[600],
    fontSize: 14,
    lineHeight: 21,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 0 },
  rowWeight: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 22.5,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center" },
});
