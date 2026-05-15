import { useState, useRef, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";

interface WorkoutFormModalProps {
  onClose: () => void;
  onSubmit: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    workoutPlanId?: string;
  }) => void;
}

export function WorkoutFormModal({ onClose, onSubmit }: WorkoutFormModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [workoutName, setWorkoutName] = useState("");
  const [gymName, setGymName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(today);
  const [workoutPlanId, setWorkoutPlanId] = useState<string>("");
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const planPickerRef = useRef<HTMLDivElement>(null);

  const { plans } = useData();
  const { user } = useAuth();

  const userId = user?.id ?? "";
  const visiblePlans = plans.filter(
    (p) => p.creatorUserId === userId || p.creatorUserId === null || p.isPublic,
  );

  const selectedPlanName = visiblePlans.find((p) => p.id === workoutPlanId)?.name;

  useEffect(() => {
    if (!planPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (planPickerRef.current && !planPickerRef.current.contains(e.target as Node)) {
        setPlanPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [planPickerOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(workoutDate);
    dateObj.setHours(new Date().getHours());
    dateObj.setMinutes(new Date().getMinutes());
    onSubmit({
      workoutName: workoutName.trim() || undefined,
      gymName: gymName.trim() || undefined,
      workoutDate: dateObj.toISOString(),
      workoutPlanId: workoutPlanId || undefined,
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
              style={{ ...inputStyle, display: "none" }}
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

          {visiblePlans.length > 0 && (
            <div ref={planPickerRef}>
              <label style={labelStyle}>
                Plan treningowy{" "}
                <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
                  (opcjonalnie)
                </span>
              </label>

              {/* Trigger */}
              <button
                type="button"
                onClick={() => setPlanPickerOpen((v) => !v)}
                style={{
                  ...inputStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                  border: planPickerOpen ? "1.5px solid var(--gg-a1)" : "1.5px solid var(--gg-border)",
                }}
              >
                <span style={{ color: selectedPlanName ? "var(--gg-text)" : "var(--gg-text-muted)" }}>
                  {selectedPlanName ?? "Zacznij bez planu"}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: planPickerOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Options */}
              {planPickerOpen && (
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 14,
                    background: "var(--gg-surface2)",
                    border: "1.5px solid var(--gg-border)",
                    overflow: "hidden",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => { setWorkoutPlanId(""); setPlanPickerOpen(false); }}
                    style={{
                      width: "100%",
                      padding: "13px 14px",
                      background: workoutPlanId === "" ? "var(--gg-grad-soft)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--gg-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "var(--gg-text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
                      Zacznij bez planu
                    </span>
                    {workoutPlanId === "" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-a1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-9"/>
                      </svg>
                    )}
                  </button>

                  {visiblePlans.map((plan, index) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => { setWorkoutPlanId(plan.id); setPlanPickerOpen(false); }}
                      style={{
                        width: "100%",
                        padding: "13px 14px",
                        background: workoutPlanId === plan.id ? "var(--gg-grad-soft)" : "transparent",
                        border: "none",
                        borderBottom: index < visiblePlans.length - 1 ? "1px solid var(--gg-border)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 14, color: "var(--gg-text)", fontFamily: "'DM Sans', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {plan.name}
                      </span>
                      {workoutPlanId === plan.id ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-a1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M5 12l5 5 9-9"/>
                        </svg>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--gg-text-muted)", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                          {plan.items.length} ćw.
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
