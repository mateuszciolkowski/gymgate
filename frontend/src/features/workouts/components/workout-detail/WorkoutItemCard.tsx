import { useState, useEffect, memo } from "react";
import type { ExerciseStats, WorkoutItem } from "@/types";
import { MUSCLE_GROUPS } from "@/constants";
import { SetRowEditable } from "./SetRowEditable";
import { DraftSetRow } from "./DraftSetRow";

interface WorkoutItemCardProps {
  item: WorkoutItem;
  exerciseNumber: number;
  isCompleted: boolean;
  isEditMode: boolean;
  isExpanded: boolean;
  stats?: ExerciseStats;
  lastSetsSummary?: string;
  lastExerciseNote?: string;
  onToggleExpand: (itemId: string) => void;
  onUpdateSet: (setId: string, data: { weight?: number; repetitions?: number }) => void;
  onDeleteSet: (itemId: string, setId: string) => void;
  onAddSet: (itemId: string, data: { weight: number; repetitions: number; setNumber: number }) => void;
  onDeleteExercise: (itemId: string) => void;
  onUpdateExerciseNotes: (itemId: string, notes: string) => Promise<void>;
}

export const WorkoutItemCard = memo(
  function WorkoutItemCard({
    item,
    exerciseNumber,
    isCompleted,
    isEditMode,
    isExpanded,
    stats,
    lastSetsSummary,
    lastExerciseNote,
    onToggleExpand,
    onUpdateSet,
    onDeleteSet,
    onAddSet,
    onDeleteExercise,
    onUpdateExerciseNotes,
  }: WorkoutItemCardProps) {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesValue, setEditNotesValue] = useState(item.notes ?? "");
    const [displayedNotes, setDisplayedNotes] = useState(item.notes ?? "");
    const canEdit = !isCompleted || isEditMode;
    const [draftSet, setDraftSet] = useState<{ weight: string; reps: string } | null>(
      item.sets.length === 0 && canEdit
        ? { weight: String(stats?.lastWeight ?? 0), reps: String(stats?.lastReps ?? 1) }
        : null,
    );

    const noteToDisplay = lastExerciseNote;

    useEffect(() => {
      if (!isEditingNotes) setEditNotesValue(item.notes ?? "");
    }, [item.notes, isEditingNotes]);

    useEffect(() => {
      setDisplayedNotes(item.notes ?? "");
    }, [item.notes]);

    useEffect(() => {
      if (!isExpanded) setDraftSet(null);
    }, [isExpanded]);

    const handleSaveExerciseNotes = async () => {
      const notes = editNotesValue.trim();
      setDisplayedNotes(notes);
      setIsEditingNotes(false);
      await onUpdateExerciseNotes(item.id, notes);
    };

    return (
      <div
        className="overflow-hidden rounded-[20px]"
        style={{
          background: "var(--gg-surface)",
          border: "1.5px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
        }}
      >
        {/* Exercise header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleExpand(item.id)}
          onKeyDown={(e) => e.key === "Enter" && onToggleExpand(item.id)}
          className="w-full text-left cursor-pointer transition-all duration-150"
          style={{ padding: "14px 16px" }}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3
                className="font-barlow font-bold text-[14px] leading-snug"
                style={{ color: "var(--gg-text)" }}
              >
                <span className="grad-text mr-1">#{exerciseNumber}</span>
                {item.exercise.name}
              </h3>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {item.exercise.muscleGroups.map((group) => {
                  const mg = MUSCLE_GROUPS.find((m) => m.value === group);
                  return (
                    <span
                      key={group}
                      className="text-[10px] font-bold tracking-[0.06em]"
                      style={{
                        color: "var(--gg-tag-text)",
                        background: "var(--gg-tag-bg)",
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      {mg?.label || group}
                    </span>
                  );
                })}
              </div>
              <p className="text-[12px] mt-1" style={{ color: "var(--gg-text-muted)" }}>
                {item.sets.length} {item.sets.length === 1 ? "seria" : "serie"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteExercise(item.id); }}
                  className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border-none cursor-pointer"
                  style={{ background: "var(--gg-surface2)" }}
                  title="Usuń ćwiczenie"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={{ padding: "0 16px 16px" }}>
            {/* Stats bar */}
            {stats && (
              <div
                className="mb-4 rounded-[12px] p-3"
                style={{ background: "var(--gg-record-bg)" }}
              >
                <div className="flex gap-3 justify-center text-[11px]">
                  <span style={{ color: "var(--gg-text-sub)" }}>
                    Ostatnio: <strong style={{ color: "var(--gg-text)" }}>
                      {lastSetsSummary ?? `${stats.lastWeight} kg × ${stats.lastReps}`}
                    </strong>
                  </span>
                  <div style={{ width: 1, background: "var(--gg-border)" }} />
                  <span style={{ color: "var(--gg-text-sub)" }}>
                    Rekord: <strong className="grad-text">
                      {stats.maxWeight} kg × {stats.maxWeightReps}
                    </strong>
                  </span>
                </div>
                {noteToDisplay && (
                  <>
                    <div style={{ height: 1, background: "var(--gg-border)", margin: "10px 0" }} />
                    <div className="text-[11px] text-center">
                      <span style={{ color: "var(--gg-text-muted)" }}>Notatka z poprzedniego:</span>
                      <p className="mt-0.5 italic" style={{ color: "var(--gg-text)" }}>
                        "{noteToDisplay}"
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sets */}
            {item.sets.length === 0 && !draftSet ? (
              <p className="text-[13px] mb-3" style={{ color: "var(--gg-text-muted)" }}>
                Brak serii. Dodaj pierwszą serię poniżej.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {item.sets.map((set) =>
                  canEdit ? (
                    <SetRowEditable
                      key={set.id}
                      set={set}
                      itemId={item.id}
                      onSave={onUpdateSet}
                      onDelete={onDeleteSet}
                    />
                  ) : (
                    <div
                      key={set.id}
                      className="flex items-center gap-3 rounded-[10px]"
                      style={{ padding: "10px 12px", background: "var(--gg-surface2)" }}
                    >
                      <span className="text-[12px] font-bold w-7 flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>
                        #{set.setNumber}
                      </span>
                      <span className="flex-1 text-[13px]" style={{ color: "var(--gg-text)" }}>
                        <strong>{set.weight}</strong> <span style={{ color: "var(--gg-text-muted)" }}>kg ×</span> <strong>{set.repetitions}</strong>
                      </span>
                    </div>
                  ),
                )}
                {draftSet && canEdit && (
                  <DraftSetRow
                    setNumber={Math.max(0, ...item.sets.map((s) => s.setNumber)) + 1}
                    defaultWeight={draftSet.weight}
                    defaultReps={draftSet.reps}
                    onConfirm={(w, r) => {
                      onAddSet(item.id, { weight: w, repetitions: r, setNumber: Math.max(0, ...item.sets.map((s) => s.setNumber)) + 1 });
                      setDraftSet(null);
                    }}
                    onCancel={() => setDraftSet(null)}
                  />
                )}
              </div>
            )}

            {/* Bottom actions */}
            {canEdit && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (draftSet) return;
                    const lastSet = item.sets[item.sets.length - 1];
                    setDraftSet({
                      weight: lastSet
                        ? String(Math.max(Number(lastSet.weight), 0))
                        : String(stats?.lastWeight ?? 0),
                      reps: lastSet
                        ? String(lastSet.repetitions)
                        : String(stats?.lastReps ?? 1),
                    });
                  }}
                  disabled={!!draftSet}
                  className="py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: "2px dashed var(--gg-a1)",
                    color: "var(--gg-a1)",
                    background: "transparent",
                  }}
                >
                  + Dodaj serię
                </button>
                <button
                  onClick={() => setIsEditingNotes((prev) => !prev)}
                  className="py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer"
                  style={{
                    border: "2px dashed var(--gg-border-med)",
                    color: "var(--gg-text-muted)",
                    background: "transparent",
                  }}
                >
                  Notatki
                </button>
              </div>
            )}

            {/* Notes editor */}
            {isEditingNotes && (
              <div
                className="mt-3 rounded-[12px]"
                style={{ padding: "12px", background: "var(--gg-surface2)" }}
              >
                <textarea
                  value={editNotesValue}
                  onChange={(e) => setEditNotesValue(e.target.value)}
                  rows={3}
                  placeholder="Dodaj notatki do tego ćwiczenia..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "var(--gg-text)",
                    background: "var(--gg-surface3)",
                    border: "1.5px solid var(--gg-border)",
                    outline: "none",
                    resize: "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setEditNotesValue(item.notes ?? ""); setIsEditingNotes(false); }}
                    className="flex-1 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer"
                    style={{ background: "var(--gg-surface3)", border: "none", color: "var(--gg-text-muted)" }}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveExerciseNotes}
                    className="flex-1 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer text-white border-none"
                    style={{ background: "var(--gg-grad-btn)" }}
                  >
                    Zapisz notatki
                  </button>
                </div>
              </div>
            )}

            {/* Displayed notes */}
            {displayedNotes && !isEditingNotes && (
              <div
                className="mt-3 rounded-[12px] text-[13px]"
                style={{ padding: "10px 12px", background: "var(--gg-surface2)" }}
              >
                <span className="font-bold" style={{ color: "var(--gg-text-sub)" }}>Notatki:</span>{" "}
                <span style={{ color: "var(--gg-text)" }}>{displayedNotes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;
    if (prevProps.exerciseNumber !== nextProps.exerciseNumber) return false;
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;
    if (prevProps.isEditMode !== nextProps.isEditMode) return false;
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;
    const pi = prevProps.item;
    const ni = nextProps.item;
    if (pi.exerciseId !== ni.exerciseId) return false;
    if (pi.exercise.name !== ni.exercise.name) return false;
    if ((pi.notes ?? null) !== (ni.notes ?? null)) return false;
    if (pi.sets.length !== ni.sets.length) return false;
    for (let i = 0; i < pi.sets.length; i++) {
      const ps = pi.sets[i];
      const ns = ni.sets[i];
      if (ps.setNumber !== ns.setNumber) return false;
      if (ps.weight !== ns.weight) return false;
      if (ps.repetitions !== ns.repetitions) return false;
    }
    const ps = prevProps.stats;
    const ns = nextProps.stats;
    if ((!ps && ns) || (ps && !ns)) return false;
    if (ps && ns) {
      if (ps.maxWeight !== ns.maxWeight) return false;
      if (ps.lastWeight !== ns.lastWeight) return false;
      if (ps.totalWorkouts !== ns.totalWorkouts) return false;
    }
    if (prevProps.lastSetsSummary !== nextProps.lastSetsSummary) return false;
    if ((prevProps.lastExerciseNote ?? null) !== (nextProps.lastExerciseNote ?? null)) return false;
    return true;
  },
);
