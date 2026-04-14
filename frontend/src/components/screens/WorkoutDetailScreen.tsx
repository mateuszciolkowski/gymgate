import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { ScreenContainer, ScreenHeader } from "@/components/ui";
import { useWorkoutData } from "@/contexts/DataContext";
import { useData } from "@/contexts/DataContext";
import type { ExerciseStats } from "@/types";
import { ExerciseSelectionModal } from "./ExerciseSelectionModal";
import { MUSCLE_GROUPS } from "@/constants";
import type { WorkoutItem, WorkoutSet } from "@/types";

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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editWorkoutName, setEditWorkoutName] = useState("");
  const [editGymName, setEditGymName] = useState("");
  const [editWorkoutDate, setEditWorkoutDate] = useState("");
  const [editWorkoutNotes, setEditWorkoutNotes] = useState("");

  const { deleteWorkout, stats: allStats, workouts } = useData();

  const {
    workout,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    deleteSet,
    deleteExercise,
    updateExerciseNotes,
    completeWorkout,
    updateWorkout,
  } = useWorkoutData(workoutId);

  // Ref do przechowywania aktualnego workout - nie powoduje re-renderów
  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  const handleAddExercise = useCallback(
    (exerciseId: string) => {
      if (!workoutRef.current) return;
      // Fire-and-forget - nie czekaj na odpowiedź
      addExercise({ exerciseId }).catch(() => {});
      setIsExerciseModalOpen(false);
    },
    [addExercise],
  );

  useEffect(() => {
    if (pendingExerciseId && workout && onExerciseAdded) {
      handleAddExercise(pendingExerciseId);
      onExerciseAdded();
    }
  }, [pendingExerciseId, workout, onExerciseAdded, handleAddExercise]);

  useEffect(() => {
    if (!loading && !workout) {
      onBack();
    }
  }, [loading, workout, onBack]);

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
  const canEditWorkout = !isCompleted || isEditMode;
  const latestSetsByExerciseId = useMemo(() => {
    const map = new Map<string, string>();
    const sortedCompletedWorkouts = [...workouts]
      .filter((entry) => entry.status === "COMPLETED")
      .sort(
        (a, b) =>
          new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime(),
      );

    sortedCompletedWorkouts.forEach((entry) => {
      entry.items.forEach((item) => {
        if (map.has(item.exerciseId) || item.sets.length === 0) return;
        const summary = [...item.sets]
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => `${set.weight} kg × ${set.repetitions}`)
          .join(", ");
        map.set(item.exerciseId, summary);
      });
    });

    return map;
  }, [workouts]);
  const latestNotesByExerciseId = useMemo(() => {
    const map = new Map<string, string>();
    const sortedCompletedWorkouts = [...workouts]
      .filter((entry) => entry.status === "COMPLETED")
      .sort(
        (a, b) =>
          b.workoutDate.localeCompare(a.workoutDate),
      );

    sortedCompletedWorkouts.forEach((entry) => {
      entry.items.forEach((item) => {
        if (map.has(item.exerciseId)) return;
        const note = item.notes?.trim();
        if (!note) return;
        map.set(item.exerciseId, note);
      });
    });

    return map;
  }, [workouts]);
  const orderedWorkoutItems = useMemo(
    () =>
      [...workout.items].sort(
        (a, b) => a.orderInWorkout - b.orderInWorkout,
      ),
    [workout.items],
  );

  const handleStartEditInfo = () => {
    setIsEditingInfo(true);
    setIsEditingNotes(false);
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

  const handleStartEditNotes = () => {
    setIsEditingNotes(true);
    setIsEditingInfo(false);
    setEditWorkoutNotes(workout?.workoutNotes || "");
  };

  const handleSaveWorkoutNotes = async () => {
    const notes = editWorkoutNotes.trim();
    setIsEditingNotes(false);
    try {
      await updateWorkout({
        workoutNotes: notes,
      });
    } catch (error) {
      setIsEditingNotes(true);
      alert("Nie udało się zapisać notatek");
    }
  };

  const handleCancelEditNotes = () => {
    setIsEditingNotes(false);
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

  const handleAddSet = useCallback(
    async (itemId: string) => {
      const currentWorkout = workoutRef.current;
      if (!currentWorkout) return;

      const item = currentWorkout.items.find((i) => i.id === itemId);
      if (!item) return;

      const lastSet = item.sets[item.sets.length - 1];
      const nextSetNumber = lastSet ? lastSet.setNumber + 1 : 1;
      const defaultWeight = lastSet ? Math.max(Number(lastSet.weight), 1) : 1;
      const defaultReps = lastSet ? lastSet.repetitions : 10;

      try {
        await addSet(itemId, {
          weight: defaultWeight,
          repetitions: defaultReps,
          setNumber: nextSetNumber,
        });
      } catch (error) {}
    },
    [addSet],
  );

  const handleDeleteSet = useCallback(
    async (itemId: string, setId: string) => {
      if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
        try {
          await deleteSet(itemId, setId);
        } catch (error) {}
      }
    },
    [deleteSet],
  );

  const handleUpdateSet = useCallback(
    async (setId: string, data: { weight?: number; repetitions?: number }) => {
      try {
        await updateSet(setId, data);
      } catch (error) {}
    },
    [updateSet],
  );

  const handleDeleteExercise = useCallback(
    async (itemId: string) => {
      if (confirm("Czy na pewno chcesz usunąć to ćwiczenie z treningu?")) {
        try {
          await deleteExercise(itemId);
        } catch (error) {}
      }
    },
    [deleteExercise],
  );

  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

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
                  onClick={() => {
                    setIsEditMode(false);
                    setIsEditingInfo(false);
                    setIsEditingNotes(false);
                  }}
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
          {!isEditingInfo && !isEditingNotes ? (
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
                {workout.workoutNotes && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Notatki:</span>
                    <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                      {workout.workoutNotes}
                    </p>
                  </div>
                )}
              </div>
              {canEditWorkout && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleStartEditInfo}
                    className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                      />
                    </svg>
                    <span>Edytuj informacje</span>
                  </button>
                  <button
                    onClick={handleStartEditNotes}
                    className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-8.25A2.25 2.25 0 0017.25 3.75H6.75A2.25 2.25 0 004.5 6v12A2.25 2.25 0 006.75 20.25h6.879a2.25 2.25 0 001.591-.659l3.621-3.621a2.25 2.25 0 00.659-1.591z"
                      />
                    </svg>
                    <span>Notatki</span>
                  </button>
                </div>
              )}
            </>
          ) : isEditingInfo ? (
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
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Notatki do treningu
                </label>
                <textarea
                  value={editWorkoutNotes}
                  onChange={(e) => setEditWorkoutNotes(e.target.value)}
                  placeholder="Dodaj notatki do treningu..."
                  rows={4}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCancelEditNotes}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveWorkoutNotes}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  Zapisz notatki
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
                      await completeWorkout();
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
            orderedWorkoutItems.map((item, index) => (
              <WorkoutItemCard
                key={item.id}
                item={item}
                exerciseNumber={index + 1}
                isCompleted={isCompleted}
                isEditMode={isEditMode}
                isExpanded={expandedItemId === item.id}
                stats={allStats.find((s) => s.exerciseId === item.exerciseId)}
                lastSetsSummary={latestSetsByExerciseId.get(item.exerciseId)}
                lastExerciseNote={latestNotesByExerciseId.get(item.exerciseId)}
                onToggleExpand={handleToggleExpand}
                onUpdateSet={handleUpdateSet}
                onDeleteSet={handleDeleteSet}
                onAddSet={handleAddSet}
                onDeleteExercise={handleDeleteExercise}
                onUpdateExerciseNotes={updateExerciseNotes}
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
  lastSetsSummary?: string;
  lastExerciseNote?: string;
  onToggleExpand: (itemId: string) => void;
  onUpdateSet: (
    setId: string,
    data: { weight?: number; repetitions?: number },
  ) => void;
  onDeleteSet: (itemId: string, setId: string) => void;
  onAddSet: (itemId: string) => void;
  onDeleteExercise: (itemId: string) => void;
  onUpdateExerciseNotes: (itemId: string, notes: string) => Promise<void>;
}

const WorkoutItemCard = memo(
  function WorkoutItemCard({
    item,
    exerciseNumber,
    isCompleted,
    isEditMode,
    isExpanded,
    stats,
    lastSetsSummary,
    lastExerciseNote,
    onToggleExpand,
    onUpdateSet,
    onDeleteSet,
    onAddSet,
    onDeleteExercise,
    onUpdateExerciseNotes,
  }: WorkoutItemCardProps) {
    // Stan edycji serii - używamy setNumber zamiast ID bo ID może się zmienić (temp -> real)
    const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null);
    const [editWeight, setEditWeight] = useState("");
    const [editReps, setEditReps] = useState("");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesValue, setEditNotesValue] = useState(item.notes ?? "");
    const [displayedNotes, setDisplayedNotes] = useState(item.notes ?? "");

    const canEdit = !isCompleted || isEditMode;
    const noteToDisplay = stats?.lastNote?.trim() || lastExerciseNote;

    useEffect(() => {
      if (!isEditingNotes) {
        setEditNotesValue(item.notes ?? "");
      }
    }, [item.notes, isEditingNotes]);
    useEffect(() => {
      setDisplayedNotes(item.notes ?? "");
    }, [item.notes]);

    // Znajdź aktualnie edytowaną serię po numerze
    const editingSet = editingSetNumber !== null 
      ? item.sets.find(s => s.setNumber === editingSetNumber)
      : null;

    const handleStartEdit = (set: WorkoutSet) => {
      setEditingSetNumber(set.setNumber);
      setEditWeight(set.weight);
      setEditReps(set.repetitions.toString());
    };

    const handleSaveSet = () => {
      if (!editingSet) return;
      const nextWeight = Number(editWeight);
      const nextReps = Number(editReps);
      const currentWeight = Number(editingSet.weight);
      const currentReps = editingSet.repetitions;

      const payload: { weight?: number; repetitions?: number } = {};
      if (nextWeight !== currentWeight) payload.weight = nextWeight;
      if (nextReps !== currentReps) payload.repetitions = nextReps;

      if (Object.keys(payload).length > 0) {
        onUpdateSet(editingSet.id, payload);
      }
      setEditingSetNumber(null);
      setEditWeight("");
      setEditReps("");
    };

    const handleCancelEdit = () => {
      setEditingSetNumber(null);
      setEditWeight("");
      setEditReps("");
    };

    const handleSaveExerciseNotes = async () => {
      const notes = editNotesValue.trim();
      setDisplayedNotes(notes);
      setIsEditingNotes(false);
      await onUpdateExerciseNotes(item.id, notes);
    };

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
              <div className="text-sm text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    Ostatnie serie:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {lastSetsSummary ?? `${stats.lastWeight} kg × ${stats.lastReps}`}
                  </p>
                </div>
                <div className="my-3 flex justify-center" aria-hidden="true">
                  <span className="h-px w-28 rounded-full bg-gradient-to-r from-purple-300 via-emerald-400 to-purple-300 dark:from-purple-700 dark:via-emerald-500 dark:to-purple-700" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    Rekord:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {stats.maxWeight} kg × {stats.maxWeightReps}
                  </p>
                </div>
                {noteToDisplay && (
                  <>
                    <div className="my-3 flex justify-center" aria-hidden="true">
                      <span className="h-px w-28 rounded-full bg-gradient-to-r from-purple-300 via-emerald-400 to-purple-300 dark:from-purple-700 dark:via-emerald-500 dark:to-purple-700" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-8.25A2.25 2.25 0 0017.25 3.75H6.75A2.25 2.25 0 004.5 6v12A2.25 2.25 0 006.75 20.25h6.879a2.25 2.25 0 001.591-.659l3.621-3.621a2.25 2.25 0 00.659-1.591z" />
                        </svg>
                        Notatka z ostatniego treningu:
                      </span>
                      <p className="font-medium text-gray-900 dark:text-white italic whitespace-pre-wrap max-w-full text-left break-words mt-1">
                        "{noteToDisplay}"
                      </p>
                    </div>
                  </>
                )}
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

                  {editingSetNumber === set.setNumber ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="number"
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          placeholder="kg"
                          className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                          step="0.5"
                          min="0"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editReps}
                          onChange={(e) => setEditReps(e.target.value)}
                          placeholder="reps"
                          className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                          min="1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveSet}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
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
                            onClick={() => handleStartEdit(set)}
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddSet(item.id)}
                className="w-full py-2 border-2 border-dashed border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm font-medium"
              >
                + Dodaj serię
              </button>
              <button
                onClick={() => setIsEditingNotes((prev) => !prev)}
                className="w-full py-2 border-2 border-dashed border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Notatki ćwiczenia
              </button>
            </div>
          )}

          {isEditingNotes && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Notatki ćwiczenia
              </label>
              <textarea
                value={editNotesValue}
                onChange={(e) => setEditNotesValue(e.target.value)}
                rows={3}
                placeholder="Dodaj notatki do tego ćwiczenia..."
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    setEditNotesValue(item.notes ?? "");
                    setIsEditingNotes(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveExerciseNotes}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  Zapisz notatki
                </button>
              </div>
            </div>
          )}

          {displayedNotes && !isEditingNotes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
              <span className="font-medium">Notatki:</span> {displayedNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
  },
  // Custom comparator - porównuj tylko istotne dane, ignoruj zmiany ID
  (prevProps, nextProps) => {
    // Jeśli referencje są takie same, nie przeładowuj
    if (prevProps === nextProps) return true;
    
    // Porównaj prymitywy
    if (prevProps.exerciseNumber !== nextProps.exerciseNumber) return false;
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;
    if (prevProps.isEditMode !== nextProps.isEditMode) return false;
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;
    
    // Porównaj item - ale ignoruj ID (bo może się zmienić z temp na real)
    const prevItem = prevProps.item;
    const nextItem = nextProps.item;
    
    // Porównaj podstawowe dane ćwiczenia
    if (prevItem.exerciseId !== nextItem.exerciseId) return false;
    if (prevItem.exercise.name !== nextItem.exercise.name) return false;
    if ((prevItem.notes ?? null) !== (nextItem.notes ?? null)) return false;
    if (prevItem.sets.length !== nextItem.sets.length) return false;
    
    // Porównaj każdą serię - ale tylko wartości, nie ID
    for (let i = 0; i < prevItem.sets.length; i++) {
      const prevSet = prevItem.sets[i];
      const nextSet = nextItem.sets[i];
      if (prevSet.setNumber !== nextSet.setNumber) return false;
      if (prevSet.weight !== nextSet.weight) return false;
      if (prevSet.repetitions !== nextSet.repetitions) return false;
    }
    
    // Porównaj stats - ale tylko istotne wartości
    const prevStats = prevProps.stats;
    const nextStats = nextProps.stats;
    if ((!prevStats && nextStats) || (prevStats && !nextStats)) return false;
    if (prevStats && nextStats) {
      if (prevStats.maxWeight !== nextStats.maxWeight) return false;
      if (prevStats.lastWeight !== nextStats.lastWeight) return false;
      if (prevStats.totalWorkouts !== nextStats.totalWorkouts) return false;
      if ((prevStats.lastNote ?? null) !== (nextStats.lastNote ?? null)) return false;
    }
    if (prevProps.lastSetsSummary !== nextProps.lastSetsSummary) return false;
    if ((prevProps.lastExerciseNote ?? null) !== (nextProps.lastExerciseNote ?? null)) return false;
    
    return true;
  }
);
