import { useState, useEffect } from "react";
import type { WorkoutSet } from "@/types";

interface SetRowEditableProps {
  set: WorkoutSet;
  itemId: string;
  onSave: (setId: string, data: { weight?: number; repetitions?: number }) => void;
  onDelete: (itemId: string, setId: string) => void;
}

export function SetRowEditable({ set, itemId, onSave, onDelete }: SetRowEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.repetitions.toString());
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setWeight(set.weight);
      setReps(set.repetitions.toString());
    }
  }, [set.weight, set.repetitions, isEditing]);

  const handleAccept = () => {
    const nextWeight = weight === "" ? 0 : Number(weight);
    const nextReps = Number(reps);
    if (isNaN(nextWeight) || isNaN(nextReps) || nextWeight < 0 || nextReps < 1) {
      setEditError("Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)");
      return;
    }
    setEditError(null);
    const payload: { weight?: number; repetitions?: number } = {};
    if (nextWeight !== Number(set.weight)) payload.weight = nextWeight;
    if (nextReps !== set.repetitions) payload.repetitions = nextReps;
    if (Object.keys(payload).length > 0) onSave(set.id, payload);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setWeight(set.weight);
    setReps(set.repetitions.toString());
    setEditError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAccept();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDelete = () => {
    if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
      onDelete(itemId, set.id);
    }
  };

  if (isEditing) {
    return (
      <div
        className="flex flex-col gap-1.5 w-full rounded-xl p-2.5 transition-all"
        style={{
          background: "var(--gg-surface2)",
          border: "1.5px solid var(--gg-a1)",
        }}
      >
        <div className="flex items-center gap-2 w-full">
          <span
            className="w-6 text-center font-bold text-[13px] font-mono shrink-0 pt-4"
            style={{ color: "var(--gg-a2)" }}
          >
            #{set.setNumber}
          </span>

          {/* Weight column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-center mb-1" style={{ color: "var(--gg-text-muted)" }}>
              Ciężar (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setEditError(null); }}
              onKeyDown={handleKeyDown}
              step="0.5"
              min="0"
              autoFocus
              placeholder="0"
              className="w-full px-2 py-2 rounded-xl font-barlow font-extrabold text-[18px] outline-none text-center num-tabular"
              style={{
                background: "var(--gg-surface)",
                border: "1px solid var(--gg-border-med)",
                color: "var(--gg-text)",
              }}
            />
          </div>

          <span className="font-bold text-[14px] shrink-0 opacity-40 pt-4" style={{ color: "var(--gg-text)" }}>
            ×
          </span>

          {/* Reps column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-center mb-1" style={{ color: "var(--gg-text-muted)" }}>
              Powtórzenia
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => { setReps(e.target.value); setEditError(null); }}
              onKeyDown={handleKeyDown}
              min="1"
              placeholder="1"
              className="w-full px-2 py-2 rounded-xl font-barlow font-extrabold text-[18px] outline-none text-center num-tabular"
              style={{
                background: "var(--gg-surface)",
                border: "1px solid var(--gg-border-med)",
                color: "var(--gg-text)",
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 pt-4">
            <button
              type="button"
              onClick={handleAccept}
              className="w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center text-white transition-transform active:scale-95 shadow-sm"
              style={{ background: "var(--gg-btn-bg)" }}
              aria-label="Zapisz serię"
              title="Zapisz serię"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-9"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-8 h-8 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
              style={{ background: "var(--gg-surface3)", color: "var(--gg-text-muted)" }}
              aria-label="Anuluj edycję serii"
              title="Anuluj"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {editError && (
          <p className="text-[11px] text-center font-semibold" style={{ color: "var(--gg-error)" }}>
            {editError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 transition-colors group"
      style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
    >
      <span
        className="text-[12px] font-bold w-6 shrink-0 text-center font-mono"
        style={{ color: "var(--gg-text-muted)" }}
      >
        #{set.setNumber}
      </span>

      {/* Set details */}
      <div
        onClick={() => setIsEditing(true)}
        className="flex-1 min-w-0 flex items-center justify-center gap-1.5 cursor-pointer num-tabular"
        style={{ color: "var(--gg-text)" }}
        title="Kliknij, aby edytować"
      >
        <span className="font-barlow font-extrabold text-[18px]">{set.weight}</span>
        <span className="text-[12px] font-medium" style={{ color: "var(--gg-text-muted)" }}>kg</span>
        <span className="text-[14px] px-0.5 font-bold opacity-40">×</span>
        <span className="font-barlow font-extrabold text-[18px]">{set.repetitions}</span>
        <span className="text-[12px] font-medium" style={{ color: "var(--gg-text-muted)" }}>powt.</span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setIsEditing(true)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors"
          style={{ background: "var(--gg-surface3)", color: "var(--gg-text-sub)" }}
          title="Edytuj serię"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors"
          style={{ background: "var(--gg-surface3)", color: "var(--gg-text-muted)" }}
          title="Usuń serię"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
