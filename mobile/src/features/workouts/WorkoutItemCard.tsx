import { memo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { draftDefaults, type DraftValues } from "@/domain/draftSet";
import { setsWord } from "@/domain/formatters";
import { MUSCLE_GROUPS } from "@/domain/muscleGroups";
import type { PreviousSetData } from "@/domain/previousSets";
import type { ExerciseStatsResult } from "@/domain/stats";
import type { WorkoutItem, WorkoutSet } from "@/domain/types";
import { fonts, pwaBarlow, tabularNums, toBoxShadow, useTheme } from "@/theme";
import { confirmAlert, Icon } from "@/ui";
import { ExercisePhotoButton } from "./ExercisePhotoButton";
import { SetEditor } from "./SetEditor";

export interface ItemCardProps {
  item: WorkoutItem;
  number: number;
  /** DRAFT workout or COMPLETED in edit mode: sets, notes and the exercise can be changed. */
  canEdit: boolean;
  isExpanded: boolean;
  /** The exercise was just added: expanding it opens the pre-filled draft set (later expansions show "Brak zapisanych serii."). */
  autoDraft?: boolean;
  stats?: ExerciseStatsResult;
  lastSetsSummary?: string;
  previousSets?: PreviousSetData[];
  onToggle: (itemId: string) => void;
  onAddSet: (itemId: string, data: { weight: number; repetitions: number }) => void;
  onUpdateSet: (setId: string, data: { weight?: number; repetitions?: number }) => void;
  onDeleteSet: (setId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
}

function SetRow({ set, canEdit, onSave, onDelete }: { set: WorkoutSet; canEdit: boolean; onSave: ItemCardProps["onUpdateSet"]; onDelete: (id: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <SetEditor
        setNumber={set.setNumber}
        initialWeight={set.weight}
        initialReps={String(set.repetitions)}
        testIDPrefix={`set-${set.setNumber}`}
        onCancel={() => setEditing(false)}
        onConfirm={(weight, repetitions) => {
          // Only what changed; no write at all when nothing did (PWA).
          const patch = {
            ...(weight !== Number(set.weight) && { weight }),
            ...(repetitions !== set.repetitions && { repetitions }),
          };
          if (Object.keys(patch).length > 0) onSave(set.id, patch);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <View style={[styles.setRow, { backgroundColor: c.surface2, borderColor: c.border }]} testID={`set-row-${set.setNumber}`}>
      <Text style={[styles.setNumber, { color: c.textMuted }]}>#{set.setNumber}</Text>
      <Pressable disabled={!canEdit} onPress={() => setEditing(true)} style={styles.setValues} accessibilityLabel={canEdit ? `Edytuj serię ${set.setNumber}` : undefined}>
        <Text style={[styles.setBig, tabularNums, { color: c.text }]}>{set.weight}</Text>
        <Text style={[styles.setUnit, { color: c.textMuted }]}>kg</Text>
        <Text style={[styles.setTimes, { color: c.text }]}>×</Text>
        <Text style={[styles.setBig, tabularNums, { color: c.text }]}>{set.repetitions}</Text>
        <Text style={[styles.setUnit, { color: c.textMuted }]}>powt.</Text>
      </Pressable>
      {canEdit ? (
        <View style={styles.setActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Edytuj serię" onPress={() => setEditing(true)} style={[styles.smallButton, { backgroundColor: c.surface3 }]}>
            <Icon name="pencil" size={13} color={c.textSub} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Usuń serię"
            testID={`set-delete-${set.setNumber}`}
            onPress={() => void confirmAlert("Czy na pewno chcesz usunąć tę serię?", "Usuń").then((ok) => ok && onDelete(set.id))}
            style={[styles.smallButton, { backgroundColor: c.surface3 }]}
          >
            <Icon name="bin" size={13} color={c.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const WorkoutItemCard = memo(function WorkoutItemCard({
  item,
  number,
  canEdit,
  isExpanded,
  autoDraft = false,
  stats,
  lastSetsSummary,
  previousSets,
  onToggle,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteItem,
  onUpdateNotes,
}: ItemCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [draft, setDraft] = useState<DraftValues | null>(null);
  const [wasExpanded, setWasExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? "");
  const nextSetNumber = Math.max(0, ...item.sets.map((s) => s.setNumber)) + 1;
  const defaults = () => draftDefaults({ sets: item.sets, previousSets, stats });

  // A freshly added exercise opens its pre-filled draft; collapsing discards it, re-expanding does not bring it back (PWA 1.7).
  if (isExpanded !== wasExpanded) {
    setWasExpanded(isExpanded);
    setDraft(isExpanded && autoDraft && canEdit && item.sets.length === 0 ? defaults() : null);
  }

  const saveNotes = () => {
    const notes = notesValue.trim();
    setNotesValue(notes);
    setEditingNotes(false);
    Keyboard.dismiss();
    onUpdateNotes(item.id, notes);
  };
  const toggleNotes = () => {
    if (!editingNotes) setNotesValue(item.notes ?? "");
    setEditingNotes((v) => !v);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, boxShadow: toBoxShadow(theme.shadow) }]} testID={`item-card-${number}`}>
      <Pressable accessibilityRole="button" testID={`item-header-${number}`} onPress={() => onToggle(item.id)} style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.nameRow}>
            <Text style={[styles.numberChip, { backgroundColor: c.surface2, color: c.textSub }]}>#{number}</Text>
            <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
              {item.exercise.name}
            </Text>
          </View>
          <View style={styles.tags}>
            {item.exercise.muscleGroups.map((g) => (
              <Text key={g} style={[styles.tag, { color: c.tagText, backgroundColor: c.tagBg }]}>
                {MUSCLE_GROUPS.find((m) => m.value === g)?.label ?? g}
              </Text>
            ))}
            <Text style={[styles.count, { color: c.textMuted }]}>
              · {item.sets.length} {setsWord(item.sets.length)}
            </Text>
          </View>
          {item.previousNote ? (
            <View style={[styles.carry, { backgroundColor: c.surface2, borderColor: c.border }]} testID={`item-previous-note-${number}`}>
              <Text style={[styles.carryLabel, { color: c.a2 }]}>Uwaga:</Text>
              <Text numberOfLines={1} style={[styles.carryText, { color: c.textSub }]}>
                {`"${item.previousNote}"`}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerButtons}>
          <ExercisePhotoButton photos={item.exercise.photos} exerciseName={item.exercise.name} />
          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Usuń ćwiczenie"
              testID={`item-delete-${number}`}
              onPress={() => void confirmAlert("Czy na pewno chcesz usunąć to ćwiczenie z treningu?", "Usuń").then((ok) => ok && onDeleteItem(item.id))}
              style={[styles.headerButton, { backgroundColor: c.surface2 }]}
            >
              <Icon name="bin" size={13} color={c.textMuted} />
            </Pressable>
          ) : null}
          <View style={[styles.headerButton, { backgroundColor: c.surface2 }]}>
            <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
              <Icon name="chevronDown" color={c.textMuted} />
            </View>
          </View>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={[styles.body, { borderTopColor: c.border }]}>
          {stats ? (
            <View style={styles.summary}>
              <Text style={[styles.summaryLine, tabularNums, { color: c.textMuted }]}>
                Ostatnio:{" "}
                <Text style={[styles.summaryValue, { color: c.textSub }]}>{lastSetsSummary ?? `${stats.lastWeight} kg × ${stats.lastReps}`}</Text>
              </Text>
              <Text style={[styles.summaryLine, tabularNums, { color: c.textMuted }]}>
                Rekord:{" "}
                <Text style={[styles.summaryValue, { color: c.a2 }]}>
                  {stats.maxWeight} kg × {stats.maxWeightReps}
                </Text>
              </Text>
            </View>
          ) : null}

          {item.sets.length === 0 && !draft ? (
            <Text style={[styles.empty, { color: c.textMuted }]}>Brak zapisanych serii.</Text>
          ) : (
            <View style={styles.sets}>
              {item.sets.map((s) => (
                <SetRow key={s.id} set={s} canEdit={canEdit} onSave={onUpdateSet} onDelete={onDeleteSet} />
              ))}
              {draft && canEdit ? (
                <SetEditor
                  setNumber={nextSetNumber}
                  initialWeight={draft.weight}
                  initialReps={draft.reps}
                  testIDPrefix="draft"
                  onCancel={() => setDraft(null)}
                  onConfirm={(weight, repetitions) => {
                    onAddSet(item.id, { weight, repetitions });
                    setDraft(null);
                  }}
                />
              ) : null}
            </View>
          )}

          {canEdit ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                testID={`add-set-${number}`}
                disabled={draft !== null}
                onPress={() => setDraft(defaults())}
                style={[styles.addSet, { backgroundColor: c.surface2, borderColor: c.borderMed, opacity: draft ? 0.4 : 1 }]}
              >
                <Text style={[styles.addSetText, { color: c.a2 }]}>+ Dodaj serię</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID={`item-notes-toggle-${number}`}
                onPress={toggleNotes}
                style={[styles.addSet, { backgroundColor: c.surface2, borderColor: c.border }]}
              >
                <Text style={[styles.addSetText, { color: c.textSub }]}>{editingNotes ? "Ukryj notatki" : "Notatki"}</Text>
              </Pressable>
            </View>
          ) : null}

          {editingNotes ? (
            <View style={[styles.notesEditor, { backgroundColor: c.surface2, borderColor: c.a1 }]}>
              <Text style={[styles.notesTitle, { color: c.text }]}>Notatka do ćwiczenia</Text>
              <TextInput
                testID={`item-notes-input-${number}`}
                value={notesValue}
                onChangeText={setNotesValue}
                placeholder="Wpisz notatkę..."
                placeholderTextColor={c.textMuted}
                selectionColor={c.a1}
                multiline
                autoFocus
                textAlignVertical="top"
                style={[styles.notesInput, { color: c.text, backgroundColor: c.surface, borderColor: c.borderMed }]}
              />
              <View style={styles.notesButtons}>
                <Pressable
                  accessibilityRole="button"
                  testID={`item-notes-cancel-${number}`}
                  onPress={() => {
                    Keyboard.dismiss();
                    setNotesValue(item.notes ?? "");
                    setEditingNotes(false);
                  }}
                  style={[styles.notesCancel, { backgroundColor: c.surface3 }]}
                >
                  <Text style={[styles.notesButtonText, { color: c.textMuted }]}>Anuluj</Text>
                </Pressable>
                <Pressable accessibilityRole="button" testID={`item-notes-save-${number}`} onPress={saveNotes} style={[styles.notesSave, { backgroundColor: c.btnBg }]}>
                  <Text style={[styles.notesButtonText, { color: "#ffffff" }]}>Zapisz notatkę</Text>
                </Pressable>
              </View>
            </View>
          ) : item.notes ? (
            <Pressable
              disabled={!canEdit}
              testID={`item-notes-${number}`}
              onPress={toggleNotes}
              style={[styles.notesShown, { backgroundColor: c.surface2, borderColor: c.border }]}
            >
              <Text style={[styles.notesShownLabel, { color: c.textMuted }]}>Notatka:</Text>
              <Text style={[styles.notesShownText, { color: c.text }]}>{item.notes}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 16 },
  headerMain: { flex: 1, minWidth: 0, paddingRight: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  numberChip: { fontFamily: "Menlo", fontWeight: "700", fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  name: { flexShrink: 1, fontFamily: pwaBarlow[700], fontSize: 15, lineHeight: 22.5 },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 },
  tag: { fontFamily: fonts.dmSans[600], fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  count: { fontFamily: fonts.dmSans[500], fontSize: 11, lineHeight: 16.5, marginLeft: 4 },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  body: { borderTopWidth: 1, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  summary: { marginTop: 8, marginBottom: 12, paddingHorizontal: 4, gap: 2 },
  summaryLine: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 16.5 },
  summaryValue: { fontFamily: fonts.dmSans[600] },
  empty: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center", paddingVertical: 16 },
  sets: { gap: 8, marginBottom: 12 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  setNumber: { width: 24, textAlign: "center", fontFamily: "Menlo", fontWeight: "700", fontSize: 12 },
  setValues: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6 },
  setBig: { fontFamily: pwaBarlow[800], fontSize: 18 },
  setUnit: { fontFamily: fonts.dmSans[500], fontSize: 12 },
  setTimes: { fontFamily: fonts.dmSans[700], fontSize: 14, opacity: 0.4, paddingHorizontal: 2 },
  setActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  smallButton: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  carry: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  carryLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5 },
  carryText: { flex: 1, fontFamily: fonts.dmSans[400], fontStyle: "italic", fontSize: 11, lineHeight: 16.5 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  addSet: { flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  notesEditor: { marginTop: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  notesTitle: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18, marginBottom: 8 },
  notesInput: { minHeight: 64, padding: 10, borderRadius: 12, borderWidth: 1, fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5 },
  notesButtons: { flexDirection: "row", gap: 8, marginTop: 10 },
  notesCancel: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, justifyContent: "center" },
  notesSave: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignItems: "center" },
  notesButtonText: { fontFamily: fonts.dmSans[700], fontSize: 12, lineHeight: 18 },
  notesShown: { marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  notesShownLabel: { fontFamily: fonts.dmSans[700], fontSize: 11, lineHeight: 16.5, marginBottom: 2 },
  notesShownText: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 19.5 },
  addSetText: { fontFamily: fonts.dmSans[700], fontSize: 13, lineHeight: 19.5 },
});
