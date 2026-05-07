import { useState } from "react";

interface WorkoutFormModalProps {
  onClose: () => void;
  onSubmit: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
  }) => void;
}

export function WorkoutFormModal({ onClose, onSubmit }: WorkoutFormModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [workoutName, setWorkoutName] = useState("");
  const [gymName, setGymName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(workoutDate);
    dateObj.setHours(new Date().getHours());
    dateObj.setMinutes(new Date().getMinutes());
    onSubmit({
      workoutName: workoutName.trim() || undefined,
      gymName: gymName.trim() || undefined,
      workoutDate: dateObj.toISOString(),
    });
  };

  const formattedDate = new Date(workoutDate).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    fontSize: 14,
    color: "var(--gg-text)",
    background: "var(--gg-surface2)",
    border: "1.5px solid var(--gg-border)",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--gg-text-sub)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 8,
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full"
        style={{
          background: "var(--gg-surface)",
          borderRadius: "28px 28px 0 0",
          padding: "28px 24px 48px",
          border: "1.5px solid var(--gg-border-med)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto mb-6"
          style={{ width: 40, height: 4, borderRadius: 2, background: "var(--gg-surface3)" }}
        />

        <h2
          className="font-barlow font-black mb-1"
          style={{ fontSize: 26, letterSpacing: "-0.02em", color: "var(--gg-text)" }}
        >
          Nowy trening
        </h2>
        <p className="text-[13px] mb-6" style={{ color: "var(--gg-text-muted)" }}>
          Wypełnij dane i zacznij trenować
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>
              Nazwa treningu{" "}
              <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
                (opcjonalnie)
              </span>
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="np. Trening nóg"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Siłownia{" "}
              <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
                (opcjonalnie)
              </span>
            </label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="np. McFit, Just Gym"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Data treningu</label>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={today}
              style={{
                ...inputStyle,
                display: "none",
              }}
              id="workout-date-input"
            />
            <div
              onClick={() => document.getElementById("workout-date-input")?.click()}
              style={{
                padding: "13px 14px",
                borderRadius: 14,
                background: "var(--gg-surface2)",
                border: "1.5px solid var(--gg-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--gg-text)" }}>{formattedDate}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          </div>

          <div className="grid gap-3 pt-2" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
            <button
              type="button"
              onClick={onClose}
              className="font-dm-sans font-bold text-[15px] rounded-[15px] cursor-pointer"
              style={{
                padding: 15,
                background: "var(--gg-surface2)",
                border: "1.5px solid var(--gg-border)",
                color: "var(--gg-text-sub)",
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="font-dm-sans font-bold text-[15px] rounded-[15px] cursor-pointer text-white border-none"
              style={{
                padding: 15,
                background: "var(--gg-grad-btn)",
                boxShadow: "0 4px 20px var(--gg-glow)",
              }}
            >
              Rozpocznij →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
