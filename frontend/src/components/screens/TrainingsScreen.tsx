import { memo, useMemo, useState } from "react";
import { ScreenContainer, ScreenHeader, EmptyState } from "@/components/ui";
import { ArchiveIcon } from "@/components/icons";
import { useData } from "@/contexts/DataContext";
import { WorkoutFormModal } from "@/components/modals";

interface TrainingsScreenProps {
  onSelectWorkout: (workoutId: string) => void;
}

export const TrainingsScreen = memo(function TrainingsScreen({
  onSelectWorkout,
}: TrainingsScreenProps) {
  const { workouts, isLoading: loading, createWorkout } = useData();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");

  const handleFormSubmit = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
  }) => {
    try {
      const newWorkout = await createWorkout(data);
      setIsFormModalOpen(false);
      onSelectWorkout(newWorkout.id);
    } catch (err) {
      alert("Błąd tworzenia treningu");
    }
  };

  const sortByWorkoutDate = (a: { workoutDate: string }, b: { workoutDate: string }) => {
    const first = new Date(a.workoutDate).getTime();
    const second = new Date(b.workoutDate).getTime();
    return dateSort === "desc" ? second - first : first - second;
  };

  const draftWorkouts = useMemo(
    () => workouts.filter((w) => w.status === "DRAFT").sort(sortByWorkoutDate),
    [workouts, dateSort],
  );
  const completedWorkouts = useMemo(
    () => workouts.filter((w) => w.status === "COMPLETED").sort(sortByWorkoutDate),
    [workouts, dateSort],
  );

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Treningi" subtitle="Historia Twoich treningów" />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Ładowanie...
            </p>
          </div>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Treningi"
        subtitle={`${completedWorkouts.length} zakończonych`}
      />

      {draftWorkouts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Treningi w trakcie
          </h3>
          <div className="space-y-3">
            {draftWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onSelectWorkout(workout.id)}
                className="w-full block p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 dark:hover:border-yellow-600 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {workout.workoutName || "Trening bez nazwy"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(workout.workoutDate).toLocaleDateString(
                        "pl-PL",
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {workout.items.length} ćwiczeń •{" "}
                      {workout.items.reduce(
                        (sum, item) => sum + item.sets.length,
                        0,
                      )}{" "}
                      serii
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">
                    W trakcie
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historia treningów
          </h3>
          <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setDateSort("desc")}
              className={`px-2 py-1 text-xs transition-colors ${
                dateSort === "desc"
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
              }`}
            >
              Data ↓
            </button>
            <button
              type="button"
              onClick={() => setDateSort("asc")}
              className={`px-2 py-1 text-xs transition-colors border-l border-gray-300 dark:border-gray-700 ${
                dateSort === "asc"
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
              }`}
            >
              Data ↑
            </button>
          </div>
        </div>
        {completedWorkouts.length === 0 && draftWorkouts.length === 0 ? (
          <EmptyState
            title="Brak zapisanych treningów"
            description="Kliknij 'Rozpocznij trening' aby dodać pierwszy"
            icon={<ArchiveIcon className="w-12 h-12" />}
          />
        ) : completedWorkouts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Brak zakończonych treningów
          </p>
        ) : (
          <div className="space-y-3">
            {completedWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onSelectWorkout(workout.id)}
                className="w-full block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {workout.workoutName || "Trening"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(workout.workoutDate).toLocaleDateString(
                        "pl-PL",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                    {workout.gymName && (
                      <p className="text-xs text-gray-500 mt-1">
                        {workout.gymName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                      {workout.items.length} ćwiczeń
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {workout.items.reduce(
                        (sum, item) => sum + item.sets.length,
                        0,
                      )}{" "}
                      serii
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {isFormModalOpen && (
        <WorkoutFormModal
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </ScreenContainer>
  );
});
