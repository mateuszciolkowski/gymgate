import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deletePlan,
  duplicatePlan,
  getProfile,
  listAllPlans,
  setPlanFavorite,
} from "@/db/repositories";
import type { Db } from "@/db/types";
import { groupLabel } from "@/domain/exerciseFilter";
import {
  canEditPlan,
  exerciseCountLabel,
  planMuscles,
  planTabs,
  visiblePlans,
  type PlanListTab,
  type PlanSort,
} from "@/domain/planList";
import type { WorkoutPlan } from "@/domain/types";
import { useAction, useDb, useDbQuery } from "@/providers";
import { fonts, pwaBarlow, useTheme } from "@/theme";
import { Button, Icon, confirmAlert, showAlert, useBarClearance } from "@/ui";
import { clearDraft } from "./draftStore";

const TABS: { id: PlanListTab; label: string }[] = [
  { id: "favorites", label: "Ulubione" },
  { id: "mine", label: "Moje" },
  { id: "builtin", label: "Built-in" },
  { id: "community", label: "Społeczność" },
];
const SORTS: [PlanSort, string][] = [
  ["az", "A–Z"],
  ["za", "Z–A"],
  ["newest", "Najnowsze"],
  ["oldest", "Najstarsze"],
];

interface CardProps {
  plan: WorkoutPlan;
  isOwner: boolean;
  canEdit: boolean;
  onEdit: (p: WorkoutPlan) => void;
  onDelete: (p: WorkoutPlan) => void;
  onDuplicate: (p: WorkoutPlan) => void;
  onFavorite: (p: WorkoutPlan) => void;
}

const PlanCard = memo(function PlanCard({
  plan,
  isOwner,
  canEdit,
  onEdit,
  onDelete,
  onDuplicate,
  onFavorite,
}: CardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [expanded, setExpanded] = useState(false);
  const muscles = planMuscles(plan);
  const small = [styles.small, { backgroundColor: c.surface2, borderColor: c.border }];
  return (
    <View
      testID={`plan-${plan.id}`}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderMed }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        testID={`plan-toggle-${plan.id}`}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
              {plan.name}
            </Text>
            <Text style={[styles.meta, { color: c.textMuted }]}>
              {exerciseCountLabel(plan.items.length)}
              {plan.isPublic ? <Text style={{ color: c.a1 }}>{"  "}• Publiczny</Text> : null}
            </Text>
          </View>
          <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }], marginTop: 3 }}>
            <Icon name="chevronDown" size={16} strokeWidth={2.5} color={c.textMuted} />
          </View>
        </View>
        {muscles.length > 0 ? (
          <View style={styles.tags}>
            {muscles.map((m) => (
              <Text
                key={m}
                style={[
                  styles.tag,
                  { color: c.textSub, backgroundColor: c.surface2, borderColor: c.border },
                ]}
              >
                {groupLabel(m)}
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>

      {expanded && plan.items.length > 0 ? (
        <View testID={`plan-items-${plan.id}`} style={[styles.items, { borderTopColor: c.border }]}>
          {plan.items.map((item, i) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={[styles.itemNo, { color: c.textMuted }]}>{i + 1}.</Text>
              <Text style={[styles.itemName, { color: c.textSub }]}>{item.exercise.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            testID={`plan-edit-${plan.id}`}
            onPress={() => onEdit(plan)}
            style={[small, styles.wide]}
          >
            <Text style={[styles.smallText, { color: c.textSub }]}>Edytuj</Text>
          </Pressable>
        ) : null}
        {!isOwner ? (
          <Pressable
            accessibilityRole="button"
            testID={`plan-duplicate-${plan.id}`}
            onPress={() => onDuplicate(plan)}
            style={[small, styles.wide]}
          >
            <Text style={[styles.smallText, { color: c.textSub }]}>Duplikuj do moich</Text>
          </Pressable>
        ) : null}
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={plan.isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          testID={`plan-favorite-${plan.id}`}
          onPress={() => onFavorite(plan)}
          style={[small, styles.icon]}
        >
          <Text style={{ color: plan.isFavorite ? c.a1 : c.textMuted, fontSize: 18 }}>
            {plan.isFavorite ? "★" : "☆"}
          </Text>
        </Pressable>
        {canEdit ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Usuń plan"
            testID={`plan-delete-${plan.id}`}
            onPress={() => onDelete(plan)}
            style={[small, styles.icon]}
          >
            <Icon name="bin" size={15} color={c.error} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

/** Plans tab (PWA PlansScreen): tabs, fuzzy search, sort, cards with edit / delete / duplicate / favorite. */
export function PlansScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const clearance = useBarClearance();
  const router = useRouter();
  const act = useAction();
  const { userId } = useDb();
  const plans = useDbQuery(useCallback((db: Db) => listAllPlans(db), []));
  const isAdmin = useDbQuery(useCallback((db: Db) => getProfile(db)?.isAdmin ?? false, []));
  const [tab, setTab] = useState<PlanListTab>("favorites");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PlanSort>("az");
  const [showSort, setShowSort] = useState(false);

  const tabbed = useMemo(() => planTabs(plans, userId), [plans, userId]);
  const list = useMemo(() => visiblePlans(tabbed[tab], search, sort), [tabbed, tab, search, sort]);

  const create = () => {
    clearDraft();
    router.push("/plan-form");
  };
  const edit = useCallback(
    (p: WorkoutPlan) => {
      clearDraft();
      router.push({ pathname: "/plan-form", params: { id: p.id } });
    },
    [router],
  );
  const remove = useCallback(
    async (p: WorkoutPlan) => {
      if (!(await confirmAlert(`Usunąć plan "${p.name}"?`, "Usuń"))) return;
      try {
        act((ctx) => deletePlan(ctx, p.id));
      } catch {
        showAlert("Nie udało się usunąć planu");
      }
    },
    [act],
  );
  const duplicate = useCallback(
    (p: WorkoutPlan) => {
      try {
        act((ctx) => duplicatePlan(ctx, p.id));
      } catch {
        showAlert("Nie udało się zduplikować planu");
      }
    },
    [act],
  );
  const favorite = useCallback(
    (p: WorkoutPlan) => {
      try {
        act((ctx) => setPlanFavorite(ctx, p.id, !p.isFavorite));
      } catch {
        showAlert("Nie udało się zmienić ulubionego");
      }
    },
    [act],
  );

  const header = (
    <View style={styles.top}>
      <View style={styles.titleBlock}>
        <Text style={[styles.overline, { color: c.textMuted }]}>Twoje plany</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Plany
        </Text>
      </View>
      <View style={[styles.hint, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Text style={{ color: c.a1, fontSize: 16 }}>★</Text>
        <Text style={[styles.hintText, { color: c.textSub }]}>
          Zaznacz gwiazdkę przy planie, aby móc wybrać go podczas tworzenia treningu
        </Text>
      </View>
      <Button
        testID="plan-create"
        size="lg"
        fullWidth
        icon={<Icon name="plusLines" size={18} strokeWidth={2.5} color="#ffffff" />}
        onPress={create}
        style={styles.cta}
      >
        Stwórz nowy plan
      </Button>
      <View style={[styles.tabs, { backgroundColor: c.surface2, borderColor: c.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t.id }}
            testID={`plans-tab-${t.id}`}
            onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && { backgroundColor: c.surface }]}
          >
            <Text style={[styles.tabText, { color: tab === t.id ? c.text : c.textMuted }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: c.surface2, borderColor: c.border }]}>
          <Icon name="search" size={14} strokeWidth={2.5} color={c.textMuted} />
          <TextInput
            testID="plans-search"
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj planów…"
            placeholderTextColor={c.textMuted}
            selectionColor={c.a1}
            autoCorrect={false}
            style={[styles.searchInput, { color: c.text }]}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Wyczyść"
              testID="plans-search-clear"
              onPress={() => setSearch("")}
            >
              <Text style={{ color: c.textMuted, fontSize: 16 }}>×</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showSort }}
          testID="plans-sort"
          onPress={() => setShowSort((v) => !v)}
          style={[
            styles.sortButton,
            { backgroundColor: showSort ? c.a1 : c.surface2, borderColor: c.border },
          ]}
        >
          <Icon name="sortLines" color={showSort ? "#ffffff" : c.textSub} />
          <Text style={[styles.sortText, { color: showSort ? "#ffffff" : c.textSub }]}>Sortuj</Text>
        </Pressable>
      </View>
      {showSort ? (
        <View style={styles.sorts}>
          {SORTS.map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === id }}
              testID={`plans-sort-${id}`}
              onPress={() => setSort(id)}
              style={[
                styles.sortChip,
                { backgroundColor: sort === id ? c.a1 : c.surface2, borderColor: c.border },
              ]}
            >
              <Text style={[styles.sortText, { color: sort === id ? "#ffffff" : c.textSub }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <FlashList
      style={{ backgroundColor: c.bg }}
      data={list}
      keyExtractor={(p) => p.id}
      extraData={userId}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingHorizontal: 20,
        paddingBottom: clearance,
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyTab tab={tab} />}
      renderItem={({ item: p }) => (
        <PlanCard
          plan={p}
          isOwner={p.creatorUserId === userId}
          canEdit={canEditPlan(p, userId, isAdmin)}
          onEdit={edit}
          onDelete={remove}
          onDuplicate={duplicate}
          onFavorite={favorite}
        />
      )}
    />
  );
}

function EmptyTab({ tab }: { tab: PlanListTab }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [title, hint] = {
    favorites: ["Brak ulubionych", "Kliknij ★ przy planie, aby dodać do ulubionych"],
    mine: ["Brak planów", "Stwórz swój pierwszy plan treningowy"],
    builtin: ["Brak wbudowanych planów", null],
    community: ["Brak publicznych planów społeczności", null],
  }[tab];
  return (
    <View testID={`plans-empty-${tab}`} style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: c.textMuted }]}>{title}</Text>
      {hint ? <Text style={[styles.emptyHint, { color: c.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  top: { marginBottom: 0 },
  titleBlock: { marginBottom: 20 },
  overline: {
    fontFamily: fonts.dmSans[700],
    fontSize: 11,
    lineHeight: 16.5,
    letterSpacing: 1.32,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: pwaBarlow[900], fontSize: 36, lineHeight: 36, letterSpacing: -1.08 },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  cta: { marginBottom: 16 },
  tabs: { flexDirection: "row", padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  tabText: { fontFamily: fonts.dmSans[700], fontSize: 13, lineHeight: 19.5 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: fonts.dmSans[400], fontSize: 13 },
  sortButton: {
    flexDirection: "row",
    gap: 4,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sortText: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18 },
  sorts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: {
    fontFamily: fonts.dmSans[500],
    fontSize: 15,
    lineHeight: 22.5,
    textAlign: "center",
    marginBottom: 4,
  },
  emptyHint: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center" },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  name: { fontFamily: pwaBarlow[700], fontSize: 17, lineHeight: 21 },
  meta: { fontFamily: fonts.dmSans[400], fontSize: 12, lineHeight: 18, marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  tag: {
    fontFamily: fonts.dmSans[500],
    fontSize: 11,
    lineHeight: 16.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  items: { borderTopWidth: 1, marginTop: 8, marginBottom: 12, paddingTop: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  itemNo: { width: 20, textAlign: "right", fontFamily: fonts.dmSans[700], fontSize: 11 },
  itemName: { flex: 1, fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  small: {
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  wide: { flex: 1 },
  icon: { width: 38, paddingVertical: 0, height: 38 },
  smallText: { fontFamily: fonts.dmSans[700], fontSize: 13, lineHeight: 19.5 },
});
