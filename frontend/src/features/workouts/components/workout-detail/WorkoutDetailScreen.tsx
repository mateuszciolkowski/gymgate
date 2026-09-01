import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useData, useWorkoutData, WorkoutNotFoundError } from "@/contexts/data";
import { computeWorkoutElapsed } from "@/utils/workoutTimer";
import { computePreviousSets } from "@/utils/previousSets";
import { ExerciseSelectionModal } from "@/features/exercises";
import { WorkoutItemCard } from "./WorkoutItemCard";
import { WorkoutEditModal } from "./WorkoutEditModal";
import { WorkoutNotesModal } from "./WorkoutNotesModal";
import { fmtTimer, fmtDuration, fmtDate } from "./formatters";

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
  const [isWorkoutEditModalOpen, setIsWorkoutEditModalOpen] = useState(false);
  const [isWorkoutNotesModalOpen, setIsWorkoutNotesModalOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Timer state — seconds elapsed since workout was created
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { deleteWorkout, stats: allStats, workouts, plans, skipPlanExercise } = useData();

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
    updateWorkout,
    completeWorkout,
  } = useWorkoutData(workoutId);

  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  // Live timer for active (DRAFT) workouts
  useEffect(() => {
    if (!workout || workout.status === "COMPLETED") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setElapsed(computeWorkoutElapsed(workout).elapsed);
    timerRef.current = setInterval(() => {
      if (workoutRef.current) {
        setElapsed(computeWorkoutElapsed(workoutRef.current).elapsed);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workout?.status, workout?.createdAt]);

  const handleAddExercise = useCallback(
    (exerciseId: string) => {
      if (!workoutRef.current) return;
      addExercise({ exerciseId }).catch((error) => {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
        }
      });
      setIsExerciseModalOpen(false);
    },
    [addExercise, onBack],
  );

  const handleAddFromPlan = useCallback(
    (exerciseId: string) => {
      if (!workoutRef.current) return;
      addExercise({ exerciseId }).catch((error) => {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
        }
      });
    },
    [addExercise, onBack],
  );

  const handleSkipPlanExercise = useCallback(
    async (exerciseId: string) => {
      try {
        await skipPlanExercise(workoutId, exerciseId);
      } catch {
        // silent — optimistic already applied
      }
    },
    [skipPlanExercise, workoutId],
  );

  useEffect(() => {
    if (pendingExerciseId && workout && onExerciseAdded) {
      handleAddExercise(pendingExerciseId);
      onExerciseAdded();
    }
  }, [pendingExerciseId, workout, onExerciseAdded, handleAddExercise]);

  useEffect(() => {
    if (!loading && !workout) onBack();
  }, [loading, workout, onBack]);

  const { latestSetsByExerciseId, previousSetsByExerciseId } = useMemo(
    () => computePreviousSets(workouts, workoutId),
    [workouts, workoutId],
  );

  const orderedWorkoutItems = useMemo(
    () =>
      workout
        ? [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout)
        : [],
    [workout?.items],
  );

  const activePlan = useMemo(
    () => (workout?.workoutPlanId ? plans.find((p) => p.id === workout.workoutPlanId) : undefined),
    [workout?.workoutPlanId, plans],
  );

  const nextFromPlan = useMemo(() => {
    if (!activePlan || !workout) return null;
    const addedExerciseIds = new Set(workout.items.map((i) => i.exerciseId));
    const skippedExerciseIds = new Set(workout.skippedPlanExerciseIds ?? []);
    const sortedPlanItems = [...activePlan.items].sort((a, b) => a.orderInPlan - b.orderInPlan);
    return (
      sortedPlanItems.find(
        (pi) => !addedExerciseIds.has(pi.exerciseId) && !skippedExerciseIds.has(pi.exerciseId),
      ) ?? null
    );
  }, [activePlan, workout]);

  const planProgress = useMemo(() => {
    if (!activePlan || !workout) return null;
    const addedExerciseIds = new Set(workout.items.map((i) => i.exerciseId));
    const skippedExerciseIds = new Set(workout.skippedPlanExerciseIds ?? []);
    const total = activePlan.items.length;
    const done = activePlan.items.filter(
      (pi) => addedExerciseIds.has(pi.exerciseId) || skippedExerciseIds.has(pi.exerciseId),
    ).length;
    return { done, total };
  }, [activePlan, workout]);

  const handleAddSet = useCallback(
    async (itemId: string, data: { weight: number; repetitions: number }) => {
      const targetItem = workoutRef.current?.items.find((i) => i.id === itemId);
      const nextSetNumber = (targetItem?.sets.length ?? 0) + 1;
      try {
        await addSet(itemId, { ...data, setNumber: nextSetNumber });
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
        }
      }
    },
    [addSet, onBack],
  );

  const handleDeleteSet = useCallback(
    async (itemId: string, setId: string) => {
      if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
        try { await deleteSet(itemId, setId); } catch (error) {
          if (error instanceof WorkoutNotFoundError) {
            onBack();
          }
        }
      }
    },
    [deleteSet, onBack],
  );

  const handleUpdateSet = useCallback(
    async (setId: string, data: { weight?: number; repetitions?: number }) => {
      try { await updateSet(setId, data); } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
        }
      }
    },
    [onBack, updateSet],
  );

  const handleDeleteExercise = useCallback(
    async (itemId: string) => {
      if (confirm("Czy na pewno chcesz usunąć to ćwiczenie z treningu?")) {
        try { await deleteExercise(itemId); } catch (error) {
          if (error instanceof WorkoutNotFoundError) {
            onBack();
          }
        }
      }
    },
    [deleteExercise, onBack],
  );

  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

  if (loading) {
    return (
      <div className="px-5 pt-6 screen-enter">
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--gg-a1)", borderTopColor: "transparent" }}
          />
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="px-5 pt-6">
        <p style={{ color: "var(--gg-error)" }}>Nie udało się załadować treningu</p>
      </div>
    );
  }

  const isCompleted = workout.status === "COMPLETED";

  const handleSaveWorkoutEditModal = async (data: {
    workoutName?: string;
    gymName?: string;
    workoutDate: string;
    durationSeconds?: number;
  }) => {
    try {
      await updateWorkout(data);
    } catch (err) {
      if (err instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      throw err;
    }
  };

  const handleSaveWorkoutNotesModal = async (notes: string) => {
    try {
      await updateWorkout({ workoutNotes: notes });
    } catch (err) {
      if (err instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      throw err;
    }
  };

  const handleDeleteWorkout = async () => {
    if (confirm("Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć.")) {
      try {
        await deleteWorkout(workoutId);
        onBack();
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
          return;
        }
        alert("Nie udało się usunąć treningu");
      }
    }
  };

  const handleCompleteWorkout = async () => {
    if (workout.items.length === 0) {
      alert("Dodaj przynajmniej jedno ćwiczenie przed zakończeniem treningu.");
      return;
    }
    const emptyExercise = workout.items.find((item) => item.sets.length === 0);
    if (emptyExercise) {
      alert(`Ćwiczenie "${emptyExercise.exercise.name}" nie ma żadnych serii. Dodaj serię lub usuń to ćwiczenie.`);
      return;
    }
    try {
      await completeWorkout(elapsed);
      onBack();
    } catch (error) {
      if (error instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      alert("Nie udało się zapisać treningu");
    }
  };

  return (
    <>
      <div className="px-4 sm:px-5 pt-4 screen-enter">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center shrink-0 transition-colors"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
              aria-label="Wróć"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-extrabold font-barlow tracking-tight truncate m-0" style={{ color: "var(--gg-text)" }}>
                {workout.workoutName || "Trening"}
              </h1>
              <span className="text-[12px] font-medium" style={{ color: "var(--gg-text-muted)" }}>
                {fmtDate(workout.workoutDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct button to open edit modal */}
            <button
              onClick={() => setIsWorkoutEditModalOpen(true)}
              className="w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
              title="Edytuj szczegóły treningu"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
              </svg>
            </button>

            <button
              onClick={handleDeleteWorkout}
              className="w-9 h-9 rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors"
              style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
              title="Usuń trening"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Workout header card */}
        {!isCompleted ? (
          <>
            {/* Active workout timer card */}
            <div
              className="mb-4 rounded-2xl p-5 transition-all"
              style={{ background: "var(--gg-surface)", border: "1px solid var(--gg-border)", boxShadow: "var(--gg-shadow)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gg-text-muted)" }}>
                    Czas trwania
                  </div>
                  <div
                    className="font-barlow font-black text-[44px] leading-none num-tabular tracking-tight"
                    style={{ color: "var(--gg-text)" }}
                  >
                    {fmtTimer(elapsed)}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: "var(--gg-text-sub)" }}>
                    {workout.gymName && (
                      <span className="font-semibold px-2 py-0.5 rounded-md" style={{ background: "var(--gg-surface2)" }}>
                        {workout.gymName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setIsWorkoutNotesModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold cursor-pointer border-none transition-colors"
                    style={{ background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                      <path d="M9 12h6M9 16h4"/>
                    </svg>
                    <span>Notatki</span>
                  </button>

                  {planProgress && (
                    <div
                      className="flex items-center justify-center px-3 py-1.5 rounded-xl text-[11px] font-bold num-tabular"
                      style={{ background: "var(--gg-active-bg)", border: "1px solid var(--gg-active-border)", color: "var(--gg-active-border)" }}
                    >
                      Plan {planProgress.done}/{planProgress.total}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Workout notes display in active workout */}
            {workout.workoutNotes && (
              <div
                onClick={() => setIsWorkoutNotesModalOpen(true)}
                className="mb-3 rounded-xl p-3.5 cursor-pointer transition-colors"
                style={{ background: "var(--gg-surface)", border: "1px solid var(--gg-border)" }}
                title="Kliknij, aby edytować notatki do sesji"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--gg-text-muted)" }}>
                  Notatki do treningu
                </span>
                <p className="text-[13px] m-0 font-medium whitespace-pre-wrap leading-relaxed" style={{ color: "var(--gg-text)" }}>
                  {workout.workoutNotes}
                </p>
              </div>
            )}

            {/* Plan banner — next exercise */}
            {activePlan && nextFromPlan && (
              <div
                className="mb-3 flex rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--gg-active-border)", background: "var(--gg-surface)" }}
              >
                <button
                  onClick={() => handleAddFromPlan(nextFromPlan.exerciseId)}
                  className="flex-1 flex items-center gap-2.5 p-3.5 text-left border-none cursor-pointer min-w-0"
                  style={{ background: "transparent", color: "var(--gg-text)" }}
                >
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md" style={{ background: "var(--gg-active-bg)", color: "var(--gg-active-border)" }}>
                    Kolejne z planu
                  </span>
                  <span className="font-bold text-[14px] truncate">{nextFromPlan.exercise.name}</span>
                </button>
                <button
                  onClick={() => handleSkipPlanExercise(nextFromPlan.exerciseId)}
                  className="flex items-center gap-1.5 px-3.5 border-none cursor-pointer shrink-0 text-[12px] font-bold transition-colors"
                  style={{ background: "var(--gg-surface2)", borderLeft: "1px solid var(--gg-border)", color: "var(--gg-text-muted)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                  <span>Pomiń</span>
                </button>
              </div>
            )}

            {/* Plan completed indicator */}
            {activePlan && !nextFromPlan && (
              <div
                className="mb-3 flex items-center justify-center gap-2 rounded-xl py-3 px-4"
                style={{ background: "var(--gg-active-bg)", border: "1px solid var(--gg-active-border)", color: "var(--gg-active-border)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-9"/>
                </svg>
                <span className="text-[12px] font-bold">Wszystkie ćwiczenia z planu zostały dodane</span>
              </div>
            )}
          </>
        ) : (
          /* Completed workout summary card */
          <div
            className="mb-4 rounded-2xl p-4 sm:p-5"
            style={{
              background: "var(--gg-surface)",
              border: "1px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            <div className="flex justify-between items-center mb-2 num-tabular">
              <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Czas treningu</span>
              <span className="text-[14px] font-bold" style={{ color: "var(--gg-a2)" }}>{fmtDuration(workout.durationSeconds)}</span>
            </div>
            <div className="flex justify-between items-center mb-2 num-tabular">
              <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Data i godzina</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--gg-text)" }}>{fmtDate(workout.workoutDate)}</span>
            </div>
            {workout.gymName && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Siłownia</span>
                <span className="text-[13px] font-semibold" style={{ color: "var(--gg-text)" }}>{workout.gymName}</span>
              </div>
            )}
            {workout.workoutNotes && (
              <div
                onClick={() => setIsWorkoutNotesModalOpen(true)}
                className="mt-3 pt-3 border-t cursor-pointer"
                style={{ borderColor: "var(--gg-border)" }}
                title="Kliknij, aby edytować notatki"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--gg-text-muted)" }}>Notatki</span>
                <p className="text-[13px] m-0 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--gg-text)" }}>{workout.workoutNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!isCompleted && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="py-3 px-3 rounded-xl font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-[0.98]"
              style={{
                background: "var(--gg-surface)",
                border: "1px solid var(--gg-border-med)",
                color: "var(--gg-text)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="20"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
              <span>Dodaj ćwiczenie</span>
            </button>

            <button
              onClick={handleCompleteWorkout}
              className="py-3 px-3 rounded-xl font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-[0.98] text-white shadow-sm"
              style={{
                background: "var(--gg-btn-bg)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-9"/>
              </svg>
              <span>Zakończ trening</span>
            </button>
          </div>
        )}

        {/* Exercise list */}
        <div className="flex flex-col gap-3 pb-24">
          {workout.items.length === 0 ? (
            <div
              className="flex flex-col items-center py-12 px-4 text-center rounded-2xl"
              style={{ background: "var(--gg-surface)", border: "1px dashed var(--gg-border)" }}
            >
              <p className="text-[15px] font-bold mb-1" style={{ color: "var(--gg-text)" }}>
                Brak ćwiczeń w tej sesji
              </p>
              {!isCompleted && (
                <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
                  Kliknij przycisk „Dodaj ćwiczenie” powyżej
                </p>
              )}
            </div>
          ) : (
            orderedWorkoutItems.map((item, index) => (
              <WorkoutItemCard
                key={item.id}
                item={item}
                exerciseNumber={index + 1}
                isCompleted={isCompleted}
                isExpanded={expandedItemId === item.id}
                stats={allStats.find((s) => s.exerciseId === item.exerciseId)}
                lastSetsSummary={latestSetsByExerciseId.get(item.exerciseId)}
                lastExerciseNote={item.previousNote ?? undefined}
                previousSets={previousSetsByExerciseId.get(item.exerciseId)}
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
      </div>

      {isExerciseModalOpen && (
        <ExerciseSelectionModal
          onClose={() => setIsExerciseModalOpen(false)}
          onSelectExercise={handleAddExercise}
          existingExerciseIds={workout.items.map((item) => item.exerciseId)}
          onCreateNewExercise={onCreateNewExercise}
        />
      )}

      {/* Workout details edit modal */}
      <WorkoutEditModal
        isOpen={isWorkoutEditModalOpen}
        onClose={() => setIsWorkoutEditModalOpen(false)}
        isCompleted={isCompleted}
        initialData={workout}
        onSave={handleSaveWorkoutEditModal}
      />

      {/* Workout notes modal */}
      <WorkoutNotesModal
        isOpen={isWorkoutNotesModalOpen}
        onClose={() => setIsWorkoutNotesModalOpen(false)}
        initialNotes={workout.workoutNotes}
        onSave={handleSaveWorkoutNotesModal}
      />
    </>
  );
}
