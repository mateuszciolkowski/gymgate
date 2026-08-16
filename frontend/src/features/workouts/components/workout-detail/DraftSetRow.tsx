import { useState } from "react";

interface DraftSetRowProps {
  setNumber: number;
  defaultWeight: string;
  defaultReps: string;
  previousSet?: { weight: string; repetitions: number };
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
    const w = weight === "" ? 0 : Number(weight);
    const r = Number(reps);
    if (isNaN(w) || isNaN(r) || w < 0 || r < 1) {
      setError("Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)");
      return;
    }
    onConfirm(w, r);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5 w-full rounded-xl p-2.5 transition-all"
      style={{
        background: "var(--gg-surface2)",
        border: "1.5px solid var(--gg-a1)",
      }}
    >
      <div className="flex items-center gap-2 w-full">
        {/* Set number badge */}
        <span
          className="w-6 text-center font-bold text-[13px] font-mono shrink-0 pt-4"
          style={{ color: "var(--gg-a2)" }}
        >
          #{setNumber}
        </span>

        {/* Weight column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider text-center mb-1" style={{ color: "var(--gg-text-muted)" }}>
            Ciężar (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }}
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
            onChange={(e) => { setReps(e.target.value); setError(null); }}
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
            onClick={handleConfirm}
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
            onClick={onCancel}
            className="w-8 h-8 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
            style={{ background: "var(--gg-surface3)", color: "var(--gg-text-muted)" }}
            aria-label="Anuluj"
            title="Anuluj"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-center font-semibold" style={{ color: "var(--gg-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
