import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { planChecklist, type PlanItemState } from "@/domain/planNext";
import { fonts, useTheme } from "@/theme";
import { Icon, Modal } from "@/ui";

interface PlanLike {
  name: string;
  items: Array<{ exerciseId: string; orderInPlan: number; exercise: { name: string } }>;
}

interface Props {
  isOpen: boolean;
  plan: PlanLike | null;
  addedExerciseIds: string[];
  skippedExerciseIds: string[];
  onClose: () => void;
  /** Adds the exercise to the workout (any not yet added one, also a skipped one). */
  onAdd: (exerciseId: string) => void;
}

const LABEL: Record<PlanItemState, string> = {
  added: "Dodane",
  next: "Następne",
  skipped: "Pominięte",
  todo: "",
};

/**
 * Every exercise of the workout's plan (tap "Plan x/y"): added ones are ticked, any other can be added out of order.
 * The "Kolejne z planu" suggestion then continues with the first remaining exercise.
 */
export function PlanChecklistModal({
  isOpen,
  plan,
  addedExerciseIds,
  skippedExerciseIds,
  onClose,
  onAdd,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const rows = planChecklist(plan, addedExerciseIds, skippedExerciseIds);
  const done = rows.filter((r) => r.state === "added" || r.state === "skipped").length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan?.name ?? "Plan"}
      subtitle={`Plan ${done}/${rows.length} · stuknij, aby dodać`}
    >
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.map((r, index) => {
          const added = r.state === "added";
          const highlight = r.state === "next";
          return (
            <Pressable
              key={r.exerciseId}
              testID={`plan-item-${index + 1}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: added }}
              accessibilityLabel={`${r.exercise.name}${LABEL[r.state] ? `, ${LABEL[r.state]}` : ""}`}
              disabled={added}
              onPress={() => {
                onAdd(r.exerciseId);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: highlight ? c.activeBg : c.surface2,
                  borderColor: highlight ? c.activeBorder : c.border,
                  opacity: added ? 0.55 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.index, { color: c.textMuted }]}>{index + 1}</Text>
              <Text
                numberOfLines={1}
                style={[styles.name, { color: c.text }, added && styles.strike]}
              >
                {r.exercise.name}
              </Text>
              {LABEL[r.state] ? (
                <Text style={[styles.state, { color: highlight ? c.activeBorder : c.textMuted }]}>
                  {LABEL[r.state]}
                </Text>
              ) : null}
              <View
                style={[
                  styles.mark,
                  {
                    backgroundColor: added ? c.a1 : "transparent",
                    borderColor: added ? c.a1 : c.borderMed,
                  },
                ]}
              >
                <Icon
                  name={added ? "check" : "plus"}
                  size={12}
                  color={added ? "#ffffff" : c.textSub}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  listContent: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  index: { width: 18, fontFamily: fonts.dmSans[700], fontSize: 12, textAlign: "center" },
  name: { flex: 1, fontFamily: fonts.dmSans[600], fontSize: 14 },
  strike: { textDecorationLine: "line-through" },
  state: {
    fontFamily: fonts.dmSans[700],
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
