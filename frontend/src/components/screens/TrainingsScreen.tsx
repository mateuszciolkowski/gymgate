import { memo, useEffect, useState } from "react";
import { ScreenContainer, ScreenHeader, EmptyState } from "@/components/ui";
import { ArchiveIcon } from "@/components/icons";
import { useWorkouts, useActiveWorkout } from "@/hooks/useWorkouts";
import { WorkoutFormModal } from "@/components/modals";

interface TrainingsScreenProps {
  onSelectWorkout: (workoutId: string) => void;
}

export const TrainingsScreen = memo(function TrainingsScreen({
  onSelectWorkout,
}: TrainingsScreenProps) {
  const { workouts, loading, error, createWorkout, refetch } = useWorkouts();
  const {
    activeWorkoutId,
    loading: activeLoading,
    refetch: refetchActive,
  } = useActiveWorkout();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  useEffect(() => {
    refetch();
    refetchActive();
  }, [refetch, refetchActive]);

  const handleStartWorkout = async () => {
    if (activeWorkoutId) {
      onSelectWorkout(activeWorkoutId);
      return;
    }

    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
  }) => {
    try {
      const newWorkout = await createWorkout(data);
      setIsFormModalOpen(false);
      await refetchActive();
      onSelectWorkout(newWorkout.id);
    } catch (err) {
      alert("Błąd tworzenia treningu");
    }
  };

  const draftWorkouts = workouts.filter((w) => w.status === "DRAFT");
  const completedWorkouts = workouts.filter((w) => w.status === "COMPLETED");

  if (loading || activeLoading) {
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

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Treningi" subtitle="Historia Twoich treningów" />
        <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
          >
            Odśwież
          </button>
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

      {/* Start new workout button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleStartWorkout}
          className={`flex items-center justify-center w-full max-w-md px-6 py-3 text-base font-medium text-white rounded-lg transition-colors shadow-md ${
            activeWorkoutId
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {activeWorkoutId ? "Kontynuuj trening" : "Rozpocznij trening"}
        </button>
      </div>

      {/* Draft workouts */}
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
                        "pl-PL"
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {workout.items.length} ćwiczeń •{" "}
                      {workout.items.reduce(
                        (sum, item) => sum + item.sets.length,
                        0
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

      {/* Completed workouts */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Historia treningów
        </h3>
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
                        }
                      )}
                    </p>
                    {workout.gymName && (
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {workout.gymName}
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
                        0
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
