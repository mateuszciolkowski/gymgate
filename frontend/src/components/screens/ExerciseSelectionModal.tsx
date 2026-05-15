import { useCallback, useEffect } from "react";
import { ExerciseList } from "../exercises/ExerciseList";

interface ExerciseSelectionModalProps {
  onClose: () => void;
  onSelectExercise: (exerciseId: string) => void;
  existingExerciseIds: string[];
  onCreateNewExercise?: () => void;
}

export function ExerciseSelectionModal({
  onClose,
  onSelectExercise,
  existingExerciseIds,
  onCreateNewExercise,
}: ExerciseSelectionModalProps) {
  useEffect(() => {
    const scrollY = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      Object.assign(document.body.style, prev);
      window.scrollTo(0, scrollY);
    };
  }, []);

  const blurActive = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, []);

  const handleClose = useCallback(() => { blurActive(); onClose(); }, [blurActive, onClose]);
  const handleSelect = useCallback((id: string) => { blurActive(); onSelectExercise(id); }, [blurActive, onSelectExercise]);
  const handleCreate = useCallback(() => { blurActive(); onCreateNewExercise?.(); }, [blurActive, onCreateNewExercise]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden"
      onClick={handleClose}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="presentation"
    >
      <div
        className="w-full flex flex-col overflow-hidden"
        style={{
          height: "90%",
          background: "var(--gg-surface)",
          borderRadius: "24px 24px 0 0",
          border: "1.5px solid var(--gg-border-med)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wybierz ćwiczenie"
      >
        {/* Handle */}
        <div className="flex-shrink-0 flex flex-col px-5 pt-5 pb-3"
          style={{ borderBottom: "1px solid var(--gg-border)" }}
        >
          <div
            className="mx-auto mb-4"
            style={{ width: 40, height: 4, borderRadius: 2, background: "var(--gg-surface3)" }}
          />
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-barlow font-black"
              style={{ fontSize: 24, color: "var(--gg-text)" }}
            >
              Wybierz ćwiczenie
            </h2>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-[32px] h-[32px] rounded-[10px] border-none cursor-pointer"
              style={{ background: "var(--gg-surface2)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {onCreateNewExercise && (
            <button
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 font-bold text-[14px] text-white rounded-[15px] border-none cursor-pointer"
              style={{
                padding: "14px",
                background: "var(--gg-grad-btn)",
                boxShadow: "0 4px 20px var(--gg-glow)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
              Dodaj nowe ćwiczenie
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scrollbar-hide">
          <ExerciseList
            mode="select"
            onSelectExercise={handleSelect}
            excludeExerciseIds={existingExerciseIds}
          />
        </div>
      </div>
    </div>
  );
}
