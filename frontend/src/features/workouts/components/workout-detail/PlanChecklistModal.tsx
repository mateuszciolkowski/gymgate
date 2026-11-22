import { memo } from "react";
import { Modal } from "@/components/ui";
import type { WorkoutPlan } from "@/types/workout";
import { planChecklist, type PlanItemState } from "@/utils/planChecklist";

const LABEL: Record<PlanItemState, string> = { added: "Dodane", next: "Następne", skipped: "Pominięte", todo: "" };

interface PlanChecklistModalProps {
  isOpen: boolean;
  plan: WorkoutPlan | undefined;
  addedExerciseIds: string[];
  skippedExerciseIds: string[];
  onClose: () => void;
  /** Adds the exercise to the workout (any not yet added one, also a skipped one). */
  onAdd: (exerciseId: string) => void;
}

/**
 * Every exercise of the workout's plan (click "Plan x/y"): added ones are ticked, any other can be added out of
 * order. The "Kolejne z planu" banner then continues with the first remaining exercise.
 */
export const PlanChecklistModal = memo(function PlanChecklistModal({
  isOpen,
  plan,
  addedExerciseIds,
  skippedExerciseIds,
  onClose,
  onAdd,
}: PlanChecklistModalProps) {
  const rows = planChecklist(plan, addedExerciseIds, skippedExerciseIds);
  const done = rows.filter((r) => r.state === "added" || r.state === "skipped").length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan?.name ?? "Plan"}
      subtitle={`Plan ${done}/${rows.length} · kliknij, aby dodać`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
        {rows.map((r, index) => {
          const added = r.state === "added";
          const highlight = r.state === "next";
          return (
            <button
              key={r.exerciseId}
              type="button"
              disabled={added}
              aria-label={`${r.exercise.name}${LABEL[r.state] ? `, ${LABEL[r.state]}` : ""}`}
              onClick={() => {
                onAdd(r.exerciseId);
                onClose();
              }}
              className="flex items-center gap-2.5 min-h-[48px] px-3 rounded-xl text-left transition-opacity disabled:cursor-default"
              style={{
                background: highlight ? "var(--gg-active-bg)" : "var(--gg-surface2)",
                border: `1px solid ${highlight ? "var(--gg-active-border)" : "var(--gg-border)"}`,
                opacity: added ? 0.55 : 1,
              }}
            >
              <span className="w-[18px] text-center text-[12px] font-bold" style={{ color: "var(--gg-text-muted)" }}>
                {index + 1}
              </span>
              <span
                className={`flex-1 truncate text-[14px] font-semibold ${added ? "line-through" : ""}`}
                style={{ color: "var(--gg-text)" }}
              >
                {r.exercise.name}
              </span>
              {LABEL[r.state] && (
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: highlight ? "var(--gg-active-border)" : "var(--gg-text-muted)" }}
                >
                  {LABEL[r.state]}
                </span>
              )}
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full"
                style={{
                  background: added ? "var(--gg-a1)" : "transparent",
                  border: `1px solid ${added ? "var(--gg-a1)" : "var(--gg-border-med)"}`,
                  color: added ? "#ffffff" : "var(--gg-text-sub)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {added ? <path d="M20 6L9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
});
