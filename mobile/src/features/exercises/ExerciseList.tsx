import { FlashList } from "@shopify/flash-list";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllStats, getProfile, type ExerciseRow } from "@/db/repositories";
import type { Db } from "@/db/types";
import { filterExercises, groupLabel } from "@/domain/exerciseFilter";
import { MUSCLE_GROUPS } from "@/domain/muscleGroups";
import { useExercises } from "@/features/workouts/queries";
import { ExercisePhotoButton } from "@/features/workouts/ExercisePhotoButton";
import { useDb, useDbQuery } from "@/providers";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { Icon, useBarClearance } from "@/ui";

type Stats = ReturnType<typeof getAllStats>[number];

interface Props {
  mode: "select" | "manage";
  /** Rendered above the search box (screen title row). */
  header?: ReactNode;
  excludeIds?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  onEdit?: (e: ExerciseRow) => void;
  onDelete?: (e: ExerciseRow) => void;
  /** Bottom padding under the last card (floating bar, safe area). */
  bottomPadding?: number;
}

function Pill({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={testID}
      onPress={onPress}
      style={[
        styles.pill,
        { backgroundColor: active ? c.surface : c.surface2, borderColor: active ? c.a1 : c.border },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? c.a2 : c.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const Card = memo(function Card({
  exercise: e,
  mode,
  stats,
  canEdit,
  highlight,
  onSelect,
  onEdit,
  onDelete,
}: {
  exercise: ExerciseRow;
  mode: "select" | "manage";
  stats?: Stats;
  canEdit: boolean;
  highlight: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (e: ExerciseRow) => void;
  onDelete?: (e: ExerciseRow) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const own = e.creatorUserId != null && e.creatorUserId !== "1";
  const body = (
    <>
      <View style={styles.cardTop}>
        <View style={styles.nameRow}>
          {own ? (
            <View style={styles.ownIcon}>
              <Icon name="user" color={c.a2} />
            </View>
          ) : null}
          <Text style={[styles.cardName, { color: c.text }]}>{e.name}</Text>
        </View>
        <View style={styles.actions}>
          <ExercisePhotoButton photos={e.photos} exerciseName={e.name} />
          {mode === "select" ? (
            <View style={[styles.action, { backgroundColor: c.btnBg }]}>
              <Icon name="plusLines" size={14} color="#ffffff" />
            </View>
          ) : canEdit ? (
            <>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edytuj ćwiczenie"
                testID={`exercise-edit-${e.id}`}
                onPress={() => onEdit?.(e)}
                style={[styles.action, { backgroundColor: c.surface2 }]}
              >
                <Icon name="pencil" size={13} strokeWidth={1.8} color={c.textSub} />
              </Pressable>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Usuń ćwiczenie"
                testID={`exercise-delete-${e.id}`}
                onPress={() => onDelete?.(e)}
                style={[styles.action, { backgroundColor: c.surface2 }]}
              >
                <Icon name="bin" size={13} strokeWidth={1.8} color={c.textMuted} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.tags}>
        {e.muscleGroups.map((g) => (
          <Text key={g} style={[styles.tag, { color: c.tagText, backgroundColor: c.tagBg }]}>
            {groupLabel(g)}
          </Text>
        ))}
      </View>
      {e.description ? (
        <Text numberOfLines={2} style={[styles.description, { color: c.textMuted }]}>
          {e.description}
        </Text>
      ) : null}
      {stats ? (
        <View style={[styles.stats, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <Text style={[styles.statText, tabularNums, { color: c.textMuted }]}>
            Ostatnio:{" "}
            <Text style={[styles.statValue, { color: c.text }]}>
              {stats.lastWeight} kg × {stats.lastReps}
            </Text>
          </Text>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <Text style={[styles.statText, tabularNums, { color: c.textMuted }]}>
            Rekord:{" "}
            <Text style={[styles.statValue, { color: c.a2 }]}>
              {stats.maxWeight} kg × {stats.maxWeightReps}
            </Text>
          </Text>
        </View>
      ) : null}
    </>
  );
  const cardStyle = [
    styles.card,
    {
      backgroundColor: c.surface,
      borderColor: highlight ? c.a1 : c.border,
      boxShadow: toBoxShadow(theme.shadow),
    },
  ];
  return mode === "select" ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={e.name}
      testID={`exercise-${e.id}`}
      onPress={() => onSelect?.(e.id)}
      style={cardStyle}
    >
      {body}
    </Pressable>
  ) : (
    <View testID={`exercise-${e.id}`} style={cardStyle}>
      {body}
    </View>
  );
});

/** PWA ExerciseList: search, sort/filter pills, muscle group chips and the cards. One component for the tab and the picker. */
export function ExerciseList({
  mode,
  header,
  excludeIds,
  onSelect,
  onEdit,
  onDelete,
  bottomPadding,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { userId } = useDb();
  const insets = useSafeAreaInsets();
  const clearance = useBarClearance();
  const all = useExercises();
  const stats = useDbQuery(
    useCallback((db: Db) => new Map(getAllStats(db).map((s) => [s.exerciseId, s])), []),
  );
  const isAdmin = useDbQuery(useCallback((db: Db) => getProfile(db)?.isAdmin ?? false, []));
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | undefined>();
  const [desc, setDesc] = useState(false);
  const [onlyPerformed, setOnlyPerformed] = useState(false);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const list = useMemo(
    () =>
      filterExercises(all, {
        userId,
        query,
        group,
        desc,
        onlyMine,
        onlyPerformed,
        onlyWithPhoto,
        excludeIds,
        performedIds: new Set(stats.keys()),
      }),
    [all, userId, query, group, desc, onlyMine, onlyPerformed, onlyWithPhoto, excludeIds, stats],
  );
  const select = useCallback(
    (id: string) => {
      Keyboard.dismiss();
      onSelect?.(id);
    },
    [onSelect],
  );

  const top = (
    <View>
      {header}
      <View style={[styles.section, { borderBottomColor: c.border }]}>
        <View style={[styles.search, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <Icon name="search" color={c.textMuted} />
          <TextInput
            testID={mode === "select" ? "picker-search" : "exercise-search"}
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj ćwiczenia..."
            placeholderTextColor={c.textMuted}
            selectionColor={c.a1}
            autoCorrect={false}
            style={[styles.searchInput, { color: c.text }]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Wyczyść"
              testID="exercise-search-clear"
              onPress={() => setQuery("")}
            >
              <Text style={[styles.clear, { color: c.textMuted }]}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View
        style={[styles.section, styles.pills, { borderBottomColor: c.border, paddingVertical: 10 }]}
      >
        <Pressable
          accessibilityRole="button"
          testID="exercise-sort"
          onPress={() => setDesc((v) => !v)}
          style={[styles.pill, { backgroundColor: c.surface2, borderColor: c.border }]}
        >
          <Text style={[styles.pillText, { color: c.text }]}>{desc ? "Z → A" : "A → Z"}</Text>
        </Pressable>
        <Pill
          testID="exercise-filter-performed"
          label="Wykonywane"
          active={onlyPerformed}
          onPress={() => setOnlyPerformed((v) => !v)}
        />
        <Pill
          testID="exercise-filter-photo"
          label="Ze zdjęciem"
          active={onlyWithPhoto}
          onPress={() => setOnlyWithPhoto((v) => !v)}
        />
        <Pill
          testID="exercise-filter-mine"
          label="Moje własne"
          active={onlyMine}
          onPress={() => setOnlyMine((v) => !v)}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={[styles.chipsScroll, { borderBottomColor: c.border }]}
        contentContainerStyle={styles.chips}
      >
        {MUSCLE_GROUPS.map((g) => {
          const active = group === g.value;
          return (
            <Pressable
              key={g.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`exercise-group-${g.value}`}
              onPress={() => setGroup(active ? undefined : g.value)}
              style={[
                styles.chip,
                {
                  borderColor: active ? c.a1 : c.border,
                  backgroundColor: active ? c.surface2 : "transparent",
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? c.a2 : c.textSub }]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ height: 16 }} />
    </View>
  );

  return (
    <FlashList
      style={{ backgroundColor: mode === "manage" ? c.bg : c.surface }}
      data={list}
      keyExtractor={(e) => e.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        paddingBottom: (bottomPadding ?? clearance) + (mode === "select" ? insets.bottom : 0),
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={top}
      ListEmptyComponent={
        <Text style={[styles.none, { color: c.textMuted }]}>
          {mode === "select" && excludeIds && excludeIds.size > 0
            ? "Wszystkie ćwiczenia zostały już dodane"
            : "Nie znaleziono ćwiczeń"}
        </Text>
      }
      renderItem={({ item: e }) => (
        <View style={styles.cardWrap}>
          <Card
            exercise={e}
            mode={mode}
            stats={stats.get(e.id)}
            canEdit={isAdmin || e.creatorUserId === userId}
            highlight={onlyPerformed && stats.has(e.id)}
            onSelect={select}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.dmSans[400], fontSize: 14 },
  clear: { fontFamily: fonts.dmSans[400], fontSize: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 22 },
  chipsScroll: { flexGrow: 0, borderBottomWidth: 1 },
  chips: { paddingHorizontal: 20, paddingVertical: 10, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: fonts.dmSans[600], fontSize: 11, lineHeight: 22 },
  none: {
    fontFamily: fonts.dmSans[400],
    fontSize: 13,
    lineHeight: 19.5,
    textAlign: "center",
    paddingVertical: 48,
  },
  cardWrap: { paddingHorizontal: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
  ownIcon: { marginRight: 6, marginTop: 4 },
  cardName: { flex: 1, fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", gap: 6, marginLeft: 8 },
  action: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tag: {
    fontFamily: fonts.dmSans[600],
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  description: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 19.5, marginBottom: 8 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  statText: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18 },
  statValue: { fontFamily: fonts.dmSans[700] },
  statDivider: { width: 1, height: 12 },
});
