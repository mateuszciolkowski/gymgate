import { useState } from "react";

interface DraftSetRowProps {
  setNumber: number;
  defaultWeight: string;
  defaultReps: string;
  onConfirm: (weight: number, reps: number) => void;
  onCancel: () => void;
}

export function DraftSetRow({
  setNumber,
  defaultWeight,
  defaultReps,
  onConfirm,
  onCancel,
}: DraftSetRowProps) {
  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const w = Number(weight);
    const r = Number(reps);
    if (isNaN(w) || isNaN(r) || w < 0 || r < 1) {
      setError("Podaj prawidłowe wartości (kg ≥ 0, powt. ≥ 1)");
      return;
    }
    onConfirm(w, r);
  };

  const inputStyle = { padding: "8px 6px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-a1)", color: "var(--gg-text)", outline: "none" };

  return (
    <div
      className="flex flex-col gap-1 w-full rounded-[10px]"
      style={{ padding: "10px 10px", background: "var(--gg-surface2)", border: "1.5px solid var(--gg-a1)" }}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-a1)" }}>
          #{setNumber}
        </span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="number"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }}
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
            onChange={(e) => { setReps(e.target.value); setError(null); }}
            min="1"
            className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
            style={inputStyle}
          />
          <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>powt.</span>
        </div>
        <button
          onClick={handleConfirm}
          className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--gg-a1)" }}
          title="Zatwierdź"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-9"/>
          </svg>
        </button>
        <button
          onClick={onCancel}
          className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--gg-surface3)" }}
          title="Anuluj"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-center" style={{ color: "var(--gg-danger, #ef4444)" }}>{error}</p>
      )}
    </div>
  );
}
