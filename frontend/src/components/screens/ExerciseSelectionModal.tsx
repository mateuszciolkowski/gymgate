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
    const previousBodyStyle = {
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
      document.body.style.position = previousBodyStyle.position;
      document.body.style.top = previousBodyStyle.top;
      document.body.style.left = previousBodyStyle.left;
      document.body.style.right = previousBodyStyle.right;
      document.body.style.width = previousBodyStyle.width;
      document.body.style.overflow = previousBodyStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const blurActiveElement = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, []);

  const handleClose = useCallback(() => {
    blurActiveElement();
    onClose();
  }, [blurActiveElement, onClose]);

  const handleSelectExercise = useCallback(
    (exerciseId: string) => {
      blurActiveElement();
      onSelectExercise(exerciseId);
    },
    [blurActiveElement, onSelectExercise],
  );

  const handleCreateNewExercise = useCallback(() => {
    blurActiveElement();
    onCreateNewExercise?.();
  }, [blurActiveElement, onCreateNewExercise]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-hidden"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl h-[90svh] sm:h-auto sm:max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wybierz ćwiczenie"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Wybierz ćwiczenie</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              ✕
            </button>
          </div>
          {onCreateNewExercise && (
            <button
              onClick={handleCreateNewExercise}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Dodaj nowe ćwiczenie
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y pb-24 sm:pb-0 [-webkit-overflow-scrolling:touch]">
          <ExerciseList
            mode="select"
            onSelectExercise={handleSelectExercise}
            excludeExerciseIds={existingExerciseIds}
          />
        </div>
      </div>
    </div>
  );
}
