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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Wybierz ćwiczenie</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              ✕
            </button>
          </div>
          {onCreateNewExercise && (
            <button
              onClick={onCreateNewExercise}
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

        <ExerciseList
          mode="select"
          onSelectExercise={onSelectExercise}
          excludeExerciseIds={existingExerciseIds}
        />
      </div>
    </div>
  );
}
