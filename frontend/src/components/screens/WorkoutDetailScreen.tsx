import { useState } from "react";
import { ScreenContainer, ScreenHeader } from "@/components/ui";
import { useWorkout, useExerciseStats, useWorkouts } from "@/hooks";
import { ExerciseSelectionModal } from "./ExerciseSelectionModal";
import type { WorkoutItem } from "@/types";

interface WorkoutDetailScreenProps {
  workoutId: string;
  onBack: () => void;
}

export function WorkoutDetailScreen({
  workoutId,
  onBack,
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

  const { deleteWorkout } = useWorkouts(undefined, false);

  const {
    workout,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    deleteSet,
    deleteExercise,
    completeWorkout,
    updateWorkout,
  } = useWorkout(workoutId);

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

  const handleAddExercise = async (exerciseId: string) => {
    try {
      const newItem = await addExercise({
        exerciseId,
        orderInWorkout: workout.items.length + 1,
      });
      setIsExerciseModalOpen(false);
      if (newItem?.id) {
        setExpandedItemId(newItem.id);
      }
    } catch (error) {}
  };

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
        "Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć."
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

  const handleDeleteSet = async (setId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
      try {
        await deleteSet(setId);
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

  const handleCompleteWorkout = async () => {
    if (isCompleted && isEditMode) {
      setIsEditMode(false);
      return;
    }

    if (confirm("Czy chcesz zakończyć ten trening?")) {
      try {
        await completeWorkout();
        onBack();
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
              {isCompleted && !isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={handleDeleteWorkout}
                    className="text-red-600 dark:text-red-400 font-medium"
                  >
                    Usuń
                  </button>
                </>
              ) : isCompleted && isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="text-gray-600 dark:text-gray-400 font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleDeleteWorkout}
                    className="text-red-600 dark:text-red-400 font-medium"
                  >
                    Usuń
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDeleteWorkout}
                  className="text-red-600 dark:text-red-400 font-medium"
                >
                  Usuń
                </button>
              )}
            </div>
          }
        />

        {/* Workout Info */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
              {(!isCompleted || isEditMode) && (
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

        {/* Exercises List */}
        <div className="space-y-6 mb-24">
          {workout.items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Brak ćwiczeń w tym treningu</p>
              <p className="text-sm mt-2">
                {!isCompleted && "Użyj przycisku poniżej aby dodać ćwiczenie"}
              </p>
            </div>
          ) : (
            workout.items.map((item) => (
              <WorkoutItemCard
                key={item.id}
                item={item}
                isCompleted={isCompleted}
                isEditMode={isEditMode}
                isExpanded={expandedItemId === item.id}
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

        {/* Action Buttons - widoczne dla DRAFT lub w trybie edycji */}
        {(!isCompleted || isEditMode) && (
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="max-w-md mx-auto flex gap-3">
              <button
                onClick={() => setIsExerciseModalOpen(true)}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 shadow-sm"
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
                Dodaj ćwiczenie
              </button>
              <button
                onClick={handleCompleteWorkout}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 shadow-sm"
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
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {isCompleted && isEditMode
                  ? "Zapisz zmiany"
                  : "Zakończ trening"}
              </button>
            </div>
          </div>
        )}
      </ScreenContainer>

      {/* Exercise Selection Modal */}
      {isExerciseModalOpen && (
        <ExerciseSelectionModal
          onClose={() => setIsExerciseModalOpen(false)}
          onSelectExercise={handleAddExercise}
          existingExerciseIds={workout.items.map((item) => item.exerciseId)}
        />
      )}
    </>
  );
}

interface WorkoutItemCardProps {
  item: WorkoutItem;
  isCompleted: boolean;
  isEditMode: boolean;
  isExpanded: boolean;
  onToggleExpand: (itemId: string) => void;
  editingSetId: string | null;
  editWeight: string;
  editReps: string;
  onEditWeightChange: (value: string) => void;
  onEditRepsChange: (value: string) => void;
  onStartEditSet: (setId: string, weight: string, reps: number) => void;
  onSaveSet: () => void;
  onCancelEdit: () => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (itemId: string) => void;
  onDeleteExercise: (itemId: string) => void;
}

function WorkoutItemCard({
  item,
  isCompleted,
  isEditMode,
  isExpanded,
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
  const { stats } = useExerciseStats(item.exerciseId);
  const canEdit = !isCompleted || isEditMode;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      {/* Exercise Header - Collapsible */}
      <button
        onClick={() => onToggleExpand(item.id)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-lg">{item.exercise.name}</h3>
          <div className="flex gap-2 flex-wrap mt-1">
            {item.exercise.muscleGroups.map((group) => (
              <span
                key={group}
                className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
              >
                {group}
              </span>
            ))}
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

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Stats */}
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

          {/* Sets List */}
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
                                set.repetitions
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
                            onClick={() => onDeleteSet(set.id)}
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

          {/* Add Set Button */}
          {canEdit && (
            <button
              onClick={() => onAddSet(item.id)}
              className="w-full py-2 border-2 border-dashed border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm font-medium"
            >
              + Dodaj serię
            </button>
          )}

          {/* Notes */}
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
