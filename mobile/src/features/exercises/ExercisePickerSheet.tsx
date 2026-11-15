import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addItem, getAllStats } from "@/db/repositories";
import type { Db } from "@/db/types";
import { fuzzyMatch } from "@/domain/fuzzyMatch";
import { MUSCLE_GROUPS } from "@/domain/muscleGroups";
import { useWorkout, useExercises } from "@/features/workouts/queries";
import { useAction, useDb, useDbQuery } from "@/providers";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { Icon } from "@/ui";

const labelOf = (group: string) => MUSCLE_GROUPS.find((m) => m.value === group)?.label ?? group;

/** Bottom sheet "Wybierz ćwiczenie" (PWA ExerciseSelectionModal + ExerciseList in select mode, search only). */
export function ExercisePickerSheet({ workoutId }: { workoutId: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const act = useAction();
  const { userId } = useDb();
  const workout = useWorkout(workoutId);
  const exercises = useExercises();
  const stats = useDbQuery(useCallback((db: Db) => new Map(getAllStats(db).map((s) => [s.exerciseId, s])), []));
  const [query, setQuery] = useState("");

  const added = useMemo(() => new Set(workout?.items.map((i) => i.exerciseId)), [workout]);
  const list = useMemo(
    () =>
      exercises
        .filter((e) => e.creatorUserId == null || e.creatorUserId === "1" || e.creatorUserId === userId)
        .filter((e) => !added.has(e.id))
        .filter((e) => !query.trim() || fuzzyMatch(e.name, query) || e.muscleGroups.some((g) => fuzzyMatch(g, query) || fuzzyMatch(labelOf(g), query)))
        .sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [exercises, userId, added, query],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace("/trainings"));
  const select = (exerciseId: string) => {
    Keyboard.dismiss();
    act((ctx) => addItem(ctx, workoutId, exerciseId));
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
        </View>

        <View style={[styles.searchWrap, { borderBottomColor: c.border }]}>
          <View style={[styles.search, { backgroundColor: c.surface2, borderColor: c.border }]}>
            <Icon name="search" color={c.textMuted} />
            <TextInput
              testID="picker-search"
              value={query}
              onChangeText={setQuery}
              placeholder="Szukaj ćwiczenia..."
              placeholderTextColor={c.textMuted}
              selectionColor={c.a1}
              autoCorrect={false}
              style={[styles.searchInput, { color: c.text }]}
            />
            {query ? (
              <Pressable accessibilityLabel="Wyczyść" onPress={() => setQuery("")}>
                <Text style={[styles.clear, { color: c.textMuted }]}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlashList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={[styles.none, { color: c.textMuted }]}>
              {added.size > 0 && !query.trim() ? "Wszystkie ćwiczenia zostały już dodane" : "Nie znaleziono ćwiczeń"}
            </Text>
          }
          renderItem={({ item: e }) => {
            const s = stats.get(e.id);
            return (
              <Pressable
                accessibilityRole="button"
                testID={`exercise-${e.id}`}
                accessibilityLabel={e.name}
                onPress={() => select(e.id)}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: c.text }]}>
                    {e.name}
                  </Text>
                  <View style={[styles.plus, { backgroundColor: c.btnBg }]}>
                    <Icon name="plusLines" size={14} color="#ffffff" />
                  </View>
                </View>
                <View style={styles.tags}>
                  {e.muscleGroups.map((g) => (
                    <Text key={g} style={[styles.tag, { color: c.tagText, backgroundColor: c.tagBg }]}>
                      {labelOf(g)}
                    </Text>
                  ))}
                </View>
                {e.description ? (
                  <Text numberOfLines={2} style={[styles.description, { color: c.textMuted }]}>
                    {e.description}
                  </Text>
                ) : null}
                {s ? (
                  <View style={[styles.stats, { backgroundColor: c.surface2, borderColor: c.border }]}>
                    <Text style={[styles.statText, tabularNums, { color: c.textMuted }]}>
                      Ostatnio:{" "}
                      <Text style={[styles.statValue, { color: c.text }]}>
                        {s.lastWeight} kg × {s.lastReps}
                      </Text>
                    </Text>
                    <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                    <Text style={[styles.statText, tabularNums, { color: c.textMuted }]}>
                      Rekord:{" "}
                      <Text style={[styles.statValue, { color: c.a2 }]}>
                        {s.maxWeight} kg × {s.maxWeightReps}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
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
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: pwaBarlow[900], fontSize: 24, lineHeight: 32 },
  close: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.dmSans[400], fontSize: 14 },
  clear: { fontFamily: fonts.dmSans[400], fontSize: 12 },
  none: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center", paddingVertical: 48 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  cardName: { flex: 1, fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22 },
  plus: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tag: { fontFamily: fonts.dmSans[600], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  description: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 19.5, marginBottom: 8 },
  stats: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  statText: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18 },
  statValue: { fontFamily: fonts.dmSans[700] },
  statDivider: { width: 1, height: 12 },
});
