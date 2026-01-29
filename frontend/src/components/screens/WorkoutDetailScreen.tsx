import { useState, useEffect, useCallback } from "react";
import { ScreenContainer, ScreenHeader } from "@/components/ui";
import { useWorkoutData } from "@/contexts/DataContext";
import { useData } from "@/contexts/DataContext";
import type { ExerciseStats } from "@/types";
import { ExerciseSelectionModal } from "./ExerciseSelectionModal";
import { MUSCLE_GROUPS } from "@/constants";
import type { WorkoutItem } from "@/types";

interface WorkoutDetailScreenProps {
  workoutId: string;
  onBack: () => void;
  onCreateNewExercise?: () => void;
  pendingExerciseId?: string | null;
  onExerciseAdded?: () => void;
}

export function WorkoutDetailScreen({
  workoutId,
  onBack,
  onCreateNewExercise,
  pendingExerciseId,
  onExerciseAdded,
}: WorkoutDetailScreenProps) {
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editWorkoutName, setEditWorkoutName] = useState("");
  const [editGymName, setEditGymName] = useState("");
  const [editWorkoutDate, setEditWorkoutDate] = useState("");

  const { deleteWorkout, stats: allStats } = useData();

  const {
    workout,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    deleteSet,
    deleteExercise,
    updateWorkout,
  } = useWorkoutData(workoutId);

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      if (!workout) return;
      try {
        await addExercise({ exerciseId });
        setIsExerciseModalOpen(false);
      } catch (error) {}
    },
    [workout, addExercise, setIsExerciseModalOpen],
  );

  useEffect(() => {
    if (pendingExerciseId && workout && onExerciseAdded) {
      handleAddExercise(pendingExerciseId);
      onExerciseAdded();
    }
  }, [pendingExerciseId, workout, onExerciseAdded, handleAddExercise]);

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Ładowanie..." onBack={onBack} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">
            Ładowanie treningu...
          </div>
        </div>
      </ScreenContainer>
    );
  }

  if (error || !workout) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Błąd" onBack={onBack} />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Nie udało się załadować treningu</div>
        </div>
      </ScreenContainer>
    );
  }

  const isCompleted = workout.status === "COMPLETED";

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const handleStartEditInfo = () => {
    setIsEditingInfo(true);
    setEditWorkoutName(workout?.workoutName || "");
    setEditGymName(workout?.gymName || "");
    const date = new Date(workout?.workoutDate || new Date());
    setEditWorkoutDate(date.toISOString().split("T")[0]);
  };

  const handleSaveWorkoutInfo = async () => {
    try {
      const dateObj = new Date(editWorkoutDate);
      dateObj.setHours(new Date().getHours());
      dateObj.setMinutes(new Date().getMinutes());

      await updateWorkout({
        workoutName: editWorkoutName.trim() || undefined,
        gymName: editGymName.trim() || undefined,
        workoutDate: dateObj.toISOString(),
      });
      setIsEditingInfo(false);
    } catch (error) {
      alert("Nie udało się zapisać zmian");
    }
  };

  const handleCancelEditInfo = () => {
    setIsEditingInfo(false);
  };

  const handleDeleteWorkout = async () => {
    if (
      confirm(
        "Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć.",
      )
    ) {
      try {
        await deleteWorkout(workoutId);
        onBack();
      } catch (error) {
        alert("Nie udało się usunąć treningu");
      }
    }
  };

  const handleAddSet = async (itemId: string) => {
    const item = workout.items.find((i) => i.id === itemId);
    if (!item) return;

    const lastSet = item.sets[item.sets.length - 1];
    const nextSetNumber = lastSet ? lastSet.setNumber + 1 : 1;
    const defaultWeight = lastSet ? Number(lastSet.weight) : 0;
    const defaultReps = lastSet ? lastSet.repetitions : 10;

    try {
      await addSet(itemId, {
        weight: defaultWeight,
        repetitions: defaultReps,
        setNumber: nextSetNumber,
      });
    } catch (error) {}
  };

  const handleStartEditSet = (setId: string, weight: string, reps: number) => {
    setEditingSetId(setId);
    setEditWeight(weight);
    setEditReps(reps.toString());
  };

  const handleSaveSet = async () => {
    if (!editingSetId) return;

    try {
      await updateSet(editingSetId, {
        weight: Number(editWeight),
        repetitions: Number(editReps),
      });
      setEditingSetId(null);
      setEditWeight("");
      setEditReps("");
    } catch (error) {}
  };

  const handleCancelEdit = () => {
    setEditingSetId(null);
    setEditWeight("");
    setEditReps("");
  };

  const handleDeleteSet = async (itemId: string, setId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
      try {
        await deleteSet(itemId, setId);
      } catch (error) {}
    }
  };

  const handleDeleteExercise = async (itemId: string) => {
    if (confirm("Czy na pewno chcesz usunąć to ćwiczenie z treningu?")) {
      try {
        await deleteExercise(itemId);
      } catch (error) {}
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <ScreenContainer>
        <ScreenHeader
          title={workout.workoutName || "Trening"}
          onBack={onBack}
          actions={
            <div className="flex items-center gap-2">
              {isCompleted && !isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  Edytuj
                </button>
              )}
              {isCompleted && isEditMode && (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="text-gray-600 dark:text-gray-400 font-medium"
                >
                  Anuluj
                </button>
              )}
              <button
                onClick={handleDeleteWorkout}
                className="text-red-600 dark:text-red-400 font-medium"
              >
                Usuń
              </button>
            </div>
          }
        />

        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {!isEditingInfo ? (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Data:
                  </span>
                  <span className="font-medium">
                    {formatDate(workout.workoutDate)}
                  </span>
                </div>
                {workout.workoutName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Nazwa:
                    </span>
                    <span className="font-medium">{workout.workoutName}</span>
                  </div>
                )}
                {workout.gymName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Siłownia:
                    </span>
                    <span className="font-medium">{workout.gymName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Status:
                  </span>
                  <span
                    className={`font-medium ${
                      workout.status === "COMPLETED"
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {workout.status === "COMPLETED"
                      ? "Zakończony"
                      : "W trakcie"}
                  </span>
                </div>
              </div>
              {isEditMode && !isEditingInfo && (
                <button
                  onClick={handleStartEditInfo}
                  className="mt-3 w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                >
                  ✏️ Edytuj informacje
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nazwa treningu
                </label>
                <input
                  type="text"
                  value={editWorkoutName}
                  onChange={(e) => setEditWorkoutName(e.target.value)}
                  placeholder="np. Trening nóg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nazwa siłowni
                </label>
                <input
                  type="text"
                  value={editGymName}
                  onChange={(e) => setEditGymName(e.target.value)}
                  placeholder="np. McFit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Data treningu
                </label>
                <input
                  type="date"
                  value={editWorkoutDate}
                  onChange={(e) => setEditWorkoutDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCancelEditInfo}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveWorkoutInfo}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  Zapisz
                </button>
              </div>
            </div>
          )}
        </div>

        {(!isCompleted || isEditMode) && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 w-full items-stretch">
              <button
                onClick={() => setIsExerciseModalOpen(true)}
                className="w-full px-5 py-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-semibold text-sm flex items-center justify-center gap-3 shadow-sm transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Dodaj ćwiczenie
              </button>
              <button
                onClick={async () => {
                  if (confirm("Czy chcesz zakończyć ten trening?")) {
                    try {
                      await updateWorkout({ status: "COMPLETED" });
                      onBack();
                    } catch (error) {
                      alert("Nie udało się zakończyć treningu");
                    }
                  }
                }}
                className="w-full px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold text-sm flex items-center justify-center gap-3 shadow-md"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {isEditMode ? "Zapisz zmiany" : "Zakończ trening"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {workout.items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Brak ćwiczeń w tym treningu</p>
              <p className="text-sm mt-2">
                {!isCompleted && "Użyj przycisku poniżej aby dodać ćwiczenie"}
              </p>
            </div>
          ) : (
            [...workout.items]
              .reverse()
              .map((item, index) => (
                <WorkoutItemCard
                  key={item.id}
                  item={item}
                  exerciseNumber={index + 1}
                  isCompleted={isCompleted}
                  isEditMode={isEditMode}
                  isExpanded={expandedItemId === item.id}
                  stats={allStats.find((s) => s.exerciseId === item.exerciseId)}
                  onToggleExpand={handleToggleExpand}
                  editingSetId={editingSetId}
                  editWeight={editWeight}
                  editReps={editReps}
                  onEditWeightChange={setEditWeight}
                  onEditRepsChange={setEditReps}
                  onStartEditSet={handleStartEditSet}
                  onSaveSet={handleSaveSet}
                  onCancelEdit={handleCancelEdit}
                  onDeleteSet={handleDeleteSet}
                  onAddSet={handleAddSet}
                  onDeleteExercise={handleDeleteExercise}
                />
              ))
          )}
        </div>
      </ScreenContainer>

      {isExerciseModalOpen && (
        <ExerciseSelectionModal
          onClose={() => setIsExerciseModalOpen(false)}
          onSelectExercise={handleAddExercise}
          existingExerciseIds={workout.items.map((item) => item.exerciseId)}
          onCreateNewExercise={onCreateNewExercise}
        />
      )}
    </>
  );
}

interface WorkoutItemCardProps {
  item: WorkoutItem;
  exerciseNumber: number;
  isCompleted: boolean;
  isEditMode: boolean;
  isExpanded: boolean;
  stats?: ExerciseStats;
  onToggleExpand: (itemId: string) => void;
  editingSetId: string | null;
  editWeight: string;
  editReps: string;
  onEditWeightChange: (value: string) => void;
  onEditRepsChange: (value: string) => void;
  onStartEditSet: (setId: string, weight: string, reps: number) => void;
  onSaveSet: () => void;
  onCancelEdit: () => void;
  onDeleteSet: (itemId: string, setId: string) => void;
  onAddSet: (itemId: string) => void;
  onDeleteExercise: (itemId: string) => void;
}

function WorkoutItemCard({
  item,
  exerciseNumber,
  isCompleted,
  isEditMode,
  isExpanded,
  stats,
  onToggleExpand,
  editingSetId,
  editWeight,
  editReps,
  onEditWeightChange,
  onEditRepsChange,
  onStartEditSet,
  onSaveSet,
  onCancelEdit,
  onDeleteSet,
  onAddSet,
  onDeleteExercise,
}: WorkoutItemCardProps) {
  const canEdit = !isCompleted || isEditMode;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      <button
        onClick={() => onToggleExpand(item.id)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-lg">
            <span className="text-emerald-600 dark:text-emerald-400 mr-2">
              #{exerciseNumber}
            </span>
            {item.exercise.name}
          </h3>
          <div className="flex gap-2 flex-wrap mt-1">
            {item.exercise.muscleGroups.map((group) => {
              const muscleGroup = MUSCLE_GROUPS.find(
                (mg) => mg.value === group,
              );
              return (
                <span
                  key={group}
                  className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
                >
                  {muscleGroup?.label || group}
                </span>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {item.sets.length} {item.sets.length === 1 ? "seria" : "serie"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteExercise(item.id);
              }}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              title="Usuń ćwiczenie"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {stats && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Ostatnio:
                  </span>
                  <span className="ml-2 font-medium">
                    {stats.lastWeight} kg × {stats.lastReps}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Rekord:
                  </span>
                  <span className="ml-2 font-medium">
                    {stats.maxWeight} kg × {stats.maxWeightReps}
                  </span>
                </div>
              </div>
            </div>
          )}

          {item.sets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Brak serii. Dodaj pierwszą serię poniżej.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {item.sets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                    #{set.setNumber}
                  </span>

                  {editingSetId === set.id ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="number"
                          value={editWeight}
                          onChange={(e) => onEditWeightChange(e.target.value)}
                          placeholder="kg"
                          className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                          step="0.5"
                          min="0"
                        />
                        <input
                          type="number"
                          value={editReps}
                          onChange={(e) => onEditRepsChange(e.target.value)}
                          placeholder="reps"
                          className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                          min="1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={onSaveSet}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex gap-4">
                        <span className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Ciężar:
                          </span>{" "}
                          <span className="font-medium">{set.weight} kg</span>
                        </span>
                        <span className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Powtórzenia:
                          </span>{" "}
                          <span className="font-medium">{set.repetitions}</span>
                        </span>
                      </div>

                      {canEdit && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              onStartEditSet(
                                set.id,
                                set.weight,
                                set.repetitions,
                              )
                            }
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                            title="Edytuj"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteSet(item.id, set.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Usuń"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => onAddSet(item.id)}
              className="w-full py-2 border-2 border-dashed border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm font-medium"
            >
              + Dodaj serię
            </button>
          )}

          {item.notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
              <span className="font-medium">Notatki:</span> {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
