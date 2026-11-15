import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exercisesWord, fmtListDate, fmtListDuration, loggedSetsWord, setsWord } from "@/domain/formatters";
import type { Workout } from "@/domain/types";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { EmptyState, Icon, PulseDot } from "@/ui";
import { useTrainings } from "./queries";

const setsOf = (w: Workout) => w.items.reduce((sum, i) => sum + i.sets.length, 0);

const WorkoutCard = memo(function WorkoutCard({ workout, onPress }: { workout: Workout; onPress: (id: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const duration = fmtListDuration(workout.durationSeconds);
  return (
    <Pressable
      accessibilityRole="button"
      testID={`workout-card-${workout.id}`}
      onPress={() => onPress(workout.id)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow), transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View style={styles.cardMain}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.cardName, { color: c.text }]}>
            {workout.workoutName || "Trening"}
          </Text>
          {duration ? <Text style={[styles.duration, { backgroundColor: c.surface2, color: c.textSub }, tabularNums]}>{duration}</Text> : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: c.textMuted }]}>{fmtListDate(workout.workoutDate)}</Text>
          {workout.gymName ? (
            <>
              <Text style={[styles.meta, { color: c.textMuted }]}>•</Text>
              <Text numberOfLines={1} style={[styles.meta, styles.shrink, { color: c.textMuted }]}>
                {workout.gymName}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.counts}>
        <View style={styles.countsText}>
          <Text style={[tabularNums, styles.exCount, { color: c.text }]}>
            {workout.items.length} <Text style={[styles.exUnit, { color: c.textMuted }]}>ćw.</Text>
          </Text>
          <Text style={[styles.setCount, { color: c.textSub }, tabularNums]}>{setsOf(workout)} {setsWord(setsOf(workout))}</Text>
        </View>
        <View style={[styles.chevron, { backgroundColor: c.surface2 }]}>
          <Icon name="chevronRight" size={14} strokeWidth={2.5} color={c.textMuted} />
        </View>
      </View>
    </Pressable>
  );
});

function ActiveCard({ workout, onPress }: { workout: Workout; onPress: (id: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const n = workout.items.length;
  return (
    <Pressable
      accessibilityRole="button"
      testID={`draft-card-${workout.id}`}
      onPress={() => onPress(workout.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.activeBg,
          borderColor: c.activeBorder,
          borderWidth: 1.5,
          boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 12, color: c.activeGlow }],
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.cardMain}>
        <Text numberOfLines={1} style={[styles.activeName, { color: c.text }]}>
          {workout.workoutName || "Aktywny trening"}
        </Text>
        <Text style={[styles.activeMeta, { color: c.textSub }, tabularNums]}>
          {n} {exercisesWord(n)} · {setsOf(workout)} {loggedSetsWord(setsOf(workout))}
        </Text>
      </View>
      <View style={[styles.back, { backgroundColor: c.activeBorder }]}>
        <Text style={styles.backLabel}>Wróć</Text>
        <Icon name="chevronRight" size={12} strokeWidth={3} color="#000000" />
      </View>
    </Pressable>
  );
}

/** Trainings tab: activity bar, in-progress drafts, history with the sort toggle (PWA TrainingsScreen). */
export function TrainingsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workouts, overview } = useTrainings();
  const [desc, setDesc] = useState(true);

  const { drafts, completed } = useMemo(() => {
    const byDate = (a: Workout, b: Workout) => (new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime()) * (desc ? 1 : -1);
    return {
      drafts: workouts.filter((w) => w.status === "DRAFT").sort(byDate),
      completed: workouts.filter((w) => w.status === "COMPLETED").sort(byDate),
    };
  }, [workouts, desc]);
  const open = (id: string) => router.push({ pathname: "/workout/[id]", params: { id } });

  const header = (
    <View>
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
              <Text testID="activity-workouts" style={[styles.metricValue, { color: c.text }]}>
                {overview.workoutsLastYear}
              </Text>
              <Text style={[styles.metricUnit, { color: c.textMuted }]}> treningów</Text>
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View>
            <Text style={[styles.metricLabel, { color: c.textMuted }]}>Wykonano</Text>
            <Text style={[styles.metricLine, tabularNums]}>
              <Text testID="activity-sets" style={[styles.metricValue, { color: c.a2 }]}>
                {overview.totalSets}
              </Text>
              <Text style={[styles.metricUnit, { color: c.textMuted }]}> serii</Text>
            </Text>
          </View>
        </View>
        <Text style={[styles.tag, { backgroundColor: c.tagBg, color: c.tagText }]}>Aktywność</Text>
      </View>

      {drafts.length > 0 ? (
        <View style={styles.drafts}>
          <View style={styles.draftsHeader}>
            <PulseDot color="#fbbf24" />
            <Text style={[styles.draftsLabel, { color: c.textSub }]}>Trening w toku</Text>
          </View>
          <View style={styles.list}>
            {drafts.map((w) => (
              <ActiveCard key={w.id} workout={w} onPress={open} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.historyHeader}>
        <View style={styles.historyTitle}>
          <Text style={[styles.historyLabel, { color: c.textMuted }]}>Historia sesji</Text>
          <Text style={[styles.count, { backgroundColor: c.surface2, color: c.textSub }, tabularNums]}>{completed.length}</Text>
        </View>
        {completed.length > 1 ? (
          <Pressable accessibilityRole="button" testID="sort-toggle" onPress={() => setDesc((v) => !v)} style={styles.sort}>
            <Text style={[styles.sortLabel, { color: c.textSub }]}>{desc ? "Od najnowszych" : "Od najstarszych"}</Text>
            <View style={{ transform: [{ rotate: desc ? "0deg" : "180deg" }] }}>
              <Icon name="chevronDown" size={11} strokeWidth={2.5} color={c.textSub} />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <FlashList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 112 }}
      data={completed}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => <WorkoutCard workout={item} onPress={open} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.borderMed }]}>
          <EmptyState
            title="Brak ukończonych treningów"
            description="Rozpocznij swój pierwszy trening, klikając przycisk powyżej."
            icon={<Icon name="emptyHistory" color={c.textMuted} />}
          />
        </View>
      }
      showsVerticalScrollIndicator={false}
      // Re-sorting must not keep the old first card in view (it would jump the list to the other end).
      maintainVisibleContentPosition={{ disabled: true }}
    />
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
  drafts: { marginBottom: 24 },
  draftsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  draftsLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase" },
  list: { gap: 10 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  historyTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase" },
  count: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  sort: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  sortLabel: { fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 16.5 },
  empty: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", padding: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardMain: { flex: 1, minWidth: 0, paddingRight: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardName: { flexShrink: 1, fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22.5, letterSpacing: -0.15 },
  duration: { fontFamily: fonts.dmSans[500], fontSize: 11, lineHeight: 16.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18 },
  shrink: { flexShrink: 1 },
  counts: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 0 },
  countsText: { alignItems: "flex-end" },
  exCount: { fontFamily: pwaBarlow[800], fontSize: 15, lineHeight: 22.5 },
  exUnit: { fontFamily: fonts.dmSans[400], fontSize: 11 },
  setCount: { fontFamily: fonts.dmSans[500], fontSize: 11, lineHeight: 16.5 },
  chevron: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeName: { fontFamily: pwaBarlow[700], fontSize: 16, lineHeight: 24, marginBottom: 4 },
  activeMeta: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  backLabel: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18, color: "#000000" },
});
