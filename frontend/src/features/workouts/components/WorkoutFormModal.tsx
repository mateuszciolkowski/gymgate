import { useState, useRef, useEffect, useMemo } from "react";
import { useData } from "@/contexts/data";

interface WorkoutFormModalProps {
  onClose: () => void;
  onSubmit: (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    workoutPlanId?: string;
  }) => void | Promise<void>;
}

export function WorkoutFormModal({ onClose, onSubmit }: WorkoutFormModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [workoutName, setWorkoutName] = useState("");
  const [gymName, setGymName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(today);
  const [workoutPlanId, setWorkoutPlanId] = useState<string>("");
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const planPickerRef = useRef<HTMLDivElement>(null);

  const { plans } = useData();
  const visiblePlans = useMemo(
    () => plans.filter((p) => p.isFavorite),
    [plans],
  );

  const selectedPlanName = visiblePlans.find((p) => p.id === workoutPlanId)?.name;

  const handlePlanSelect = (planId: string) => {
    const prevPlan = visiblePlans.find((p) => p.id === workoutPlanId);
    setWorkoutPlanId(planId);
    if (planId) {
      const plan = visiblePlans.find((p) => p.id === planId);
      if (plan?.shortName) {
        if (!workoutName.trim() || (prevPlan?.shortName && workoutName === prevPlan.shortName)) {
          setWorkoutName(plan.shortName);
        }
      }
    }
    setPlanPickerOpen(false);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const [year, month, day] = workoutDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setHours(new Date().getHours());
    dateObj.setMinutes(new Date().getMinutes());
    try {
      await onSubmit({
        workoutName: workoutName.trim() || undefined,
        gymName: gymName.trim() || undefined,
        workoutDate: dateObj.toISOString(),
        workoutPlanId: workoutPlanId || undefined,
      });
    } catch {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(workoutDate).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:p-6"
        style={{
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border-med)",
          boxShadow: "var(--gg-shadow-elevated)",
        }}
      >
        {/* Handle for mobile */}
        <div
          className="mx-auto mb-5 sm:hidden"
          style={{ width: 36, height: 4, borderRadius: 2, background: "var(--gg-surface3)" }}
        />

        <div className="mb-5">
          <h2
            className="font-barlow font-extrabold text-[22px] tracking-tight mb-1"
            style={{ color: "var(--gg-text)" }}
          >
            Nowy trening
          </h2>
          <p className="text-[13px] font-medium" style={{ color: "var(--gg-text-muted)" }}>
            Wypełnij szczegóły i przejdź do sesji
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
              Nazwa treningu <span className="text-[10px] font-normal normal-case opacity-60">(opcjonalnie)</span>
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="np. Klatka + Triceps"
              className="w-full px-3.5 py-3 rounded-xl text-[14px] outline-none transition-all"
              style={{
                background: "var(--gg-surface2)",
                border: "1px solid var(--gg-border)",
                color: "var(--gg-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
              Siłownia / Lokalizacja <span className="text-[10px] font-normal normal-case opacity-60">(opcjonalnie)</span>
            </label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="np. CityFit, Zdrofit"
              className="w-full px-3.5 py-3 rounded-xl text-[14px] outline-none transition-all"
              style={{
                background: "var(--gg-surface2)",
                border: "1px solid var(--gg-border)",
                color: "var(--gg-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
              Data treningu
            </label>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={today}
              className="hidden"
              id="workout-date-input"
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("workout-date-input") as HTMLInputElement | null;
                if (el) {
                  if (typeof el.showPicker === "function") el.showPicker();
                  else el.click();
                }
              }}
              className="w-full px-3.5 py-3 rounded-xl text-[14px] flex justify-between items-center cursor-pointer transition-all"
              style={{
                background: "var(--gg-surface2)",
                border: "1px solid var(--gg-border)",
                color: "var(--gg-text)",
              }}
            >
              <span>{formattedDate}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gg-text-muted)" }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
          </div>

          {visiblePlans.length > 0 && (
            <div ref={planPickerRef}>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
                Plan treningowy <span className="text-[10px] font-normal normal-case opacity-60">(opcjonalnie)</span>
              </label>

              <button
                type="button"
                onClick={() => setPlanPickerOpen((v) => !v)}
                className="w-full px-3.5 py-3 rounded-xl text-[14px] flex justify-between items-center cursor-pointer transition-all"
                style={{
                  background: "var(--gg-surface2)",
                  border: planPickerOpen ? "1px solid var(--gg-a1)" : "1px solid var(--gg-border)",
                  color: selectedPlanName ? "var(--gg-text)" : "var(--gg-text-muted)",
                }}
              >
                <span className="truncate">{selectedPlanName ?? "Zacznij bez planu"}</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    color: "var(--gg-text-muted)",
                    transform: planPickerOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {planPickerOpen && (
                <div
                  className="mt-1.5 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
                  style={{
                    background: "var(--gg-surface2)",
                    border: "1px solid var(--gg-border-med)",
                    boxShadow: "var(--gg-shadow)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setWorkoutPlanId(""); setPlanPickerOpen(false); }}
                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between text-[13px] border-b cursor-pointer transition-colors hover:bg-[var(--gg-surface3)]"
                    style={{
                      borderColor: "var(--gg-border)",
                      color: workoutPlanId === "" ? "var(--gg-a2)" : "var(--gg-text-muted)",
                    }}
                  >
                    <span>Zacznij bez planu</span>
                    {workoutPlanId === "" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-9"/>
                      </svg>
                    )}
                  </button>

                  {visiblePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handlePlanSelect(plan.id)}
                      className="w-full px-3.5 py-2.5 text-left flex items-center justify-between text-[13px] cursor-pointer transition-colors hover:bg-[var(--gg-surface3)]"
                      style={{
                        color: workoutPlanId === plan.id ? "var(--gg-a2)" : "var(--gg-text)",
                      }}
                    >
                      <span className="truncate pr-2">{plan.name}</span>
                      <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--gg-text-muted)" }}>
                        {plan.items.length} ćw.
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3 px-4 rounded-xl text-[14px] font-bold cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: "var(--gg-surface2)",
                border: "1px solid var(--gg-border)",
                color: "var(--gg-text-sub)",
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-4 rounded-xl text-[14px] font-bold cursor-pointer transition-all active:scale-[0.98] text-white"
              style={{
                background: "var(--gg-btn-bg)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {isSubmitting ? "Tworzenie…" : "Rozpocznij"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
