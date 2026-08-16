import { useState, useEffect, memo } from "react";
import type { ExerciseStats, WorkoutItem } from "@/types";
import { MUSCLE_GROUPS } from "@/constants";
import { SetRowEditable } from "./SetRowEditable";
import { DraftSetRow } from "./DraftSetRow";

interface PreviousSetData {
  setNumber: number;
  weight: string;
  repetitions: number;
}

interface WorkoutItemCardProps {
  item: WorkoutItem;
  exerciseNumber: number;
  isCompleted: boolean;
  isEditMode?: boolean;
  isExpanded: boolean;
  stats?: ExerciseStats;
  lastSetsSummary?: string;
  lastExerciseNote?: string;
  previousSets?: PreviousSetData[];
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
    previousSets,
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

    const nextSetNumber = Math.max(0, ...item.sets.map((s) => s.setNumber)) + 1;
    const matchingPreviousForDraft = previousSets?.find((ps) => ps.setNumber === nextSetNumber);

    const [draftSet, setDraftSet] = useState<{ weight: string; reps: string } | null>(
      item.sets.length === 0 && canEdit
        ? {
            weight: matchingPreviousForDraft
              ? matchingPreviousForDraft.weight
              : String(stats?.lastWeight ?? 0),
            reps: matchingPreviousForDraft
              ? String(matchingPreviousForDraft.repetitions)
              : String(stats?.lastReps ?? 1),
          }
        : null,
    );

    const noteToDisplay = item.previousNote ?? lastExerciseNote;

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
        className="overflow-hidden rounded-2xl transition-all"
        style={{
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
        }}
      >
        {/* Exercise header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleExpand(item.id)}
          onKeyDown={(e) => e.key === "Enter" && onToggleExpand(item.id)}
          className="w-full text-left cursor-pointer transition-colors p-4 flex justify-between items-start"
        >
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
              >
                #{exerciseNumber}
              </span>
              <h3
                className="font-barlow font-bold text-[15px] truncate"
                style={{ color: "var(--gg-text)" }}
              >
                {item.exercise.name}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {item.exercise.muscleGroups.map((group) => {
                const mg = MUSCLE_GROUPS.find((m) => m.value === group);
                return (
                  <span
                    key={group}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                    style={{
                      color: "var(--gg-tag-text)",
                      background: "var(--gg-tag-bg)",
                    }}
                  >
                    {mg?.label || group}
                  </span>
                );
              })}
              <span className="text-[11px] font-medium ml-1" style={{ color: "var(--gg-text-muted)" }}>
                · {item.sets.length} {item.sets.length === 1 ? "seria" : "serie"}
              </span>
            </div>

            {/* Carry-over note directly in header */}
            {noteToDisplay && (
              <div
                className="mt-2.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
                style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
              >
                <span className="shrink-0 font-bold" style={{ color: "var(--gg-a2)" }}>Uwaga:</span>
                <span className="italic truncate" style={{ color: "var(--gg-text-sub)" }}>
                  "{noteToDisplay}"
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteExercise(item.id); }}
                className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors"
                style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
                title="Usuń ćwiczenie"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--gg-border)" }}>
            {/* Stats bar */}
            {stats && (
              <div
                className="mb-3 mt-2 rounded-xl p-2.5"
                style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
              >
                <div className="flex gap-4 justify-around text-[12px] num-tabular">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--gg-text-muted)" }}>
                      Ostatnio (ogółem)
                    </span>
                    <strong style={{ color: "var(--gg-text)" }}>
                      {lastSetsSummary ?? `${stats.lastWeight} kg × ${stats.lastReps}`}
                    </strong>
                  </div>
                  <div className="border-r" style={{ borderColor: "var(--gg-border)" }} />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--gg-text-muted)" }}>
                      Rekord max
                    </span>
                    <strong style={{ color: "var(--gg-a2)" }}>
                      {stats.maxWeight} kg × {stats.maxWeightReps}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Table Column Headers */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--gg-text-muted)" }}
            >
              <span className="w-6 text-center shrink-0">Seria</span>
              <span className="w-24 sm:w-28 shrink-0">Poprzednio</span>
              <span className="flex-1">Dzisiaj (kg × powt.)</span>
              <span className="w-14 sm:w-16 text-right shrink-0">Akcje</span>
            </div>

            {/* Sets list */}
            {item.sets.length === 0 && !draftSet ? (
              <div className="text-center py-4 text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
                Brak zapisanych serii.
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {item.sets.map((set) => {
                  const matchingPrev = previousSets?.find((ps) => ps.setNumber === set.setNumber);
                  return canEdit ? (
                    <SetRowEditable
                      key={set.id}
                      set={set}
                      itemId={item.id}
                      previousSet={matchingPrev}
                      onSave={onUpdateSet}
                      onDelete={onDeleteSet}
                    />
                  ) : (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
                    >
                      <span className="text-[12px] font-mono font-bold w-6 text-center shrink-0" style={{ color: "var(--gg-text-muted)" }}>
                        #{set.setNumber}
                      </span>
                      <div className="w-24 sm:w-28 shrink-0 text-[12px] num-tabular" style={{ color: "var(--gg-text-muted)" }}>
                        {matchingPrev ? (
                          <span>
                            <strong className="font-semibold text-[var(--gg-text-sub)]">{matchingPrev.weight}</strong> kg × {matchingPrev.repetitions}
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </div>
                      <span className="flex-1 text-[14px] num-tabular" style={{ color: "var(--gg-text)" }}>
                        <strong className="font-bold">{set.weight}</strong> <span style={{ color: "var(--gg-text-muted)" }}>kg ×</span> <strong className="font-bold">{set.repetitions}</strong> <span style={{ color: "var(--gg-text-muted)" }}>powt.</span>
                      </span>
                    </div>
                  );
                })}

                {draftSet && canEdit && (
                  <DraftSetRow
                    setNumber={nextSetNumber}
                    defaultWeight={draftSet.weight}
                    defaultReps={draftSet.reps}
                    previousSet={matchingPreviousForDraft}
                    onConfirm={(w, r) => {
                      onAddSet(item.id, { weight: w, repetitions: r, setNumber: nextSetNumber });
                      setDraftSet(null);
                    }}
                    onCancel={() => setDraftSet(null)}
                  />
                )}
              </div>
            )}

            {/* Bottom actions */}
            {canEdit && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => {
                    if (draftSet) return;
                    const lastSet = item.sets[item.sets.length - 1];
                    const nextNum = (lastSet ? lastSet.setNumber : 0) + 1;
                    const prevMatch = previousSets?.find((ps) => ps.setNumber === nextNum);
                    setDraftSet({
                      weight: lastSet
                        ? String(Math.max(Number(lastSet.weight), 0))
                        : prevMatch
                        ? prevMatch.weight
                        : String(stats?.lastWeight ?? 0),
                      reps: lastSet
                        ? String(lastSet.repetitions)
                        : prevMatch
                        ? String(prevMatch.repetitions)
                        : String(stats?.lastReps ?? 1),
                    });
                  }}
                  disabled={!!draftSet}
                  className="py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--gg-surface2)",
                    border: "1px solid var(--gg-border-med)",
                    color: "var(--gg-a2)",
                  }}
                >
                  + Dodaj serię
                </button>
                <button
                  onClick={() => setIsEditingNotes((prev) => !prev)}
                  className="py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    background: "var(--gg-surface2)",
                    border: "1px solid var(--gg-border)",
                    color: "var(--gg-text-sub)",
                  }}
                >
                  {isEditingNotes ? "Ukryj notatki" : "Notatki"}
                </button>
              </div>
            )}

            {/* Notes editor */}
            {isEditingNotes && (
              <div
                className="mt-3 rounded-2xl p-3.5 transition-all"
                style={{
                  background: "var(--gg-surface2)",
                  border: "1.5px solid var(--gg-a1)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[12px] font-bold" style={{ color: "var(--gg-text)" }}>
                    Notatka do ćwiczenia
                  </span>
                </div>

                <textarea
                  value={editNotesValue}
                  onChange={(e) => setEditNotesValue(e.target.value)}
                  rows={2}
                  placeholder="Wpisz notatkę..."
                  autoFocus
                  className="w-full p-2.5 rounded-xl text-[13px] outline-none transition-colors"
                  style={{
                    color: "var(--gg-text)",
                    background: "var(--gg-surface)",
                    border: "1px solid var(--gg-border-med)",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />

                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => { setEditNotesValue(item.notes ?? ""); setIsEditingNotes(false); }}
                    className="py-2 px-3 rounded-xl text-[12px] font-bold cursor-pointer border-none transition-colors"
                    style={{ background: "var(--gg-surface3)", color: "var(--gg-text-muted)" }}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveExerciseNotes}
                    className="flex-1 py-2 px-3 rounded-xl text-[12px] font-bold cursor-pointer border-none text-white transition-transform active:scale-95 shadow-sm"
                    style={{ background: "var(--gg-btn-bg)" }}
                  >
                    Zapisz notatkę
                  </button>
                </div>
              </div>
            )}

            {/* Displayed notes */}
            {displayedNotes && !isEditingNotes && (
              <div
                onClick={() => canEdit && setIsEditingNotes(true)}
                className={`mt-2.5 rounded-xl text-[12px] p-3 flex items-start gap-2 ${canEdit ? "cursor-pointer" : ""}`}
                style={{
                  background: "var(--gg-surface2)",
                  border: "1px solid var(--gg-border)",
                }}
                title={canEdit ? "Kliknij, aby edytować notatkę" : undefined}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-bold block mb-0.5 text-[11px]" style={{ color: "var(--gg-text-muted)" }}>
                    Notatka:
                  </span>
                  <p className="m-0 font-medium leading-relaxed" style={{ color: "var(--gg-text)" }}>
                    {displayedNotes}
                  </p>
                </div>
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
    if ((pi.previousNote ?? null) !== (ni.previousNote ?? null)) return false;
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
    if (prevProps.previousSets !== nextProps.previousSets) return false;
    return true;
  },
);
