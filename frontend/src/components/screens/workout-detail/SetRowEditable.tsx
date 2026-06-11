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
    const nextWeight = Number(weight);
    const nextReps = Number(reps);
    if (isNaN(nextWeight) || isNaN(nextReps) || nextWeight < 0 || nextReps < 1) {
      setEditError("Podaj prawidłowe wartości (kg ≥ 0, powt. ≥ 1)");
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

  const handleDelete = () => {
    if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
      onDelete(itemId, set.id);
    }
  };

  const rowBg = { padding: "10px 10px", background: "var(--gg-surface2)" };
  const inputStyle = { padding: "8px 6px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text)", outline: "none" };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 w-full rounded-[10px]" style={rowBg}>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-text-muted)" }}>
            #{set.setNumber}
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="number"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setEditError(null); }}
              step="0.5"
              min="0"
              autoFocus
              className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
              style={inputStyle}
            />
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>kg</span>
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="number"
              value={reps}
              onChange={(e) => { setReps(e.target.value); setEditError(null); }}
              min="1"
              className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
              style={inputStyle}
            />
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>powt.</span>
          </div>
          <button
            onClick={handleAccept}
            className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gg-a1)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-9"/>
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gg-surface3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {editError && (
          <p className="text-[11px] text-center" style={{ color: "var(--gg-danger, #ef4444)" }}>{editError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full rounded-[10px]" style={rowBg}>
      <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-text-muted)" }}>
        #{set.setNumber}
      </span>
      <span className="flex-1 text-[13px]" style={{ color: "var(--gg-text)" }}>
        <strong>{set.weight}</strong> <span style={{ color: "var(--gg-text-muted)" }}>kg ×</span> <strong>{set.repetitions}</strong> <span style={{ color: "var(--gg-text-muted)" }}>powt.</span>
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gg-surface3)" }}
        title="Edytuj"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button
        onClick={handleDelete}
        className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gg-surface3)" }}
        title="Usuń"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}
