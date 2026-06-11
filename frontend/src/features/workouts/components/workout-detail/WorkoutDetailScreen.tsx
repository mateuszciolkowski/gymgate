import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useData, useWorkoutData, WorkoutNotFoundError } from "@/contexts/data";
import { computeWorkoutElapsed } from "@/utils/workoutTimer";
import { ExerciseSelectionModal } from "@/features/exercises";
import { WorkoutItemCard } from "./WorkoutItemCard";
import { fmtTimer, fmtDuration, fmtDate, inputStyle } from "./formatters";

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
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

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
    completeWorkout,
    updateWorkout,
  } = useWorkoutData(workoutId);

  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  // Start timer when workout is DRAFT
  useEffect(() => {
    if (!workout || workout.status !== "DRAFT") return;

    const startedAt = new Date(workout.createdAt).getTime();
    const { elapsed: initialElapsed, isStale } = computeWorkoutElapsed(workout);
    setElapsed(initialElapsed);

    if (!isStale) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workout?.id, workout?.status]);

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

  const latestSetsByExerciseId = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...workouts]
      .filter((w) => w.status === "COMPLETED")
      .sort((a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime());
    sorted.forEach((w) => {
      w.items.forEach((item) => {
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
    const addedIds = new Set(workout.items.map((i) => i.exerciseId));
    const skippedIds = new Set(workout.skippedPlanExerciseIds ?? []);
    return (
      [...activePlan.items]
        .sort((a, b) => a.orderInPlan - b.orderInPlan)
        .find((item) => !addedIds.has(item.exerciseId) && !skippedIds.has(item.exerciseId)) ?? null
    );
  }, [activePlan, workout?.items, workout?.skippedPlanExerciseIds]);

  const planProgress = useMemo(() => {
    if (!activePlan || !workout) return null;
    const addedFromPlan = workout.items.filter((i) =>
      activePlan.items.some((pi) => pi.exerciseId === i.exerciseId),
    ).length;
    return { done: addedFromPlan, total: activePlan.items.length };
  }, [activePlan, workout?.items]);

  const editedDurationSeconds = useMemo(() => {
    if (!editStartTime || !editEndTime || !editWorkoutDate) return null;
    const [year, month, day] = editWorkoutDate.split("-").map(Number);
    const [startH, startM] = editStartTime.split(":").map(Number);
    const [endH, endM] = editEndTime.split(":").map(Number);
    const startDate = new Date(year, month - 1, day, startH, startM, 0, 0);
    const endDate = new Date(year, month - 1, day, endH, endM, 0, 0);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    return seconds > 0 ? seconds : null;
  }, [editStartTime, editEndTime, editWorkoutDate]);

  const handleAddSet = useCallback(
    async (itemId: string, data: { weight: number; repetitions: number; setNumber: number }) => {
      try {
        await addSet(itemId, data);
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
      <div className="px-5 pt-5 screen-enter">
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
      <div className="px-5 pt-5">
        <p style={{ color: "var(--gg-error)" }}>Nie udało się załadować treningu</p>
      </div>
    );
  }

  const isCompleted = workout.status === "COMPLETED";
  const canEditWorkout = !isCompleted || isEditMode;

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
      if (error instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      alert("Nie udało się zapisać zmian");
    }
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
      await updateWorkout({ workoutNotes: notes });
    } catch (error) {
      if (error instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      setIsEditingNotes(true);
      alert("Nie udało się zapisać notatek");
    }
  };

  const handleStartEditCompleted = () => {
    setEditWorkoutName(workout?.workoutName || "");
    setEditGymName(workout?.gymName || "");
    setEditWorkoutNotes(workout?.workoutNotes || "");
    const date = new Date(workout?.workoutDate || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setEditWorkoutDate(`${year}-${month}-${day}`);

    const startDate = new Date(workout!.workoutDate);
    setEditStartTime(`${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`);

    const endMs = startDate.getTime() + (workout!.durationSeconds || 0) * 1000;
    const endDate = new Date(endMs);
    setEditEndTime(`${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`);

    setIsEditMode(true);
  };

  const handleSaveCompletedEdits = async () => {
    try {
      const [year, month, day] = editWorkoutDate.split("-").map(Number);
      const [startH, startM] = (editStartTime || "00:00").split(":").map(Number);
      const startDate = new Date(year, month - 1, day, startH, startM, 0, 0);
      await updateWorkout({
        workoutName: editWorkoutName.trim() || undefined,
        gymName: editGymName.trim() || undefined,
        workoutDate: startDate.toISOString(),
        workoutNotes: editWorkoutNotes.trim() || undefined,
        ...(editedDurationSeconds !== null && { durationSeconds: editedDurationSeconds }),
      });
      setIsEditMode(false);
    } catch (error) {
      if (error instanceof WorkoutNotFoundError) {
        onBack();
        return;
      }
      alert("Nie udało się zapisać zmian");
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
    if (confirm("Czy chcesz zakończyć ten trening?")) {
      try {
        if (timerRef.current) clearInterval(timerRef.current);
        await completeWorkout(elapsed);
        onBack();
      } catch (error) {
        if (error instanceof WorkoutNotFoundError) {
          onBack();
          return;
        }
        alert("Nie udało się zakończyć treningu");
      }
    }
  };

  return (
    <>
      <div className="px-5 pt-5 screen-enter">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] border-none cursor-pointer"
            style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: "var(--gg-text-muted)" }}>
              {isCompleted ? "Trening zakończony" : "Trening aktywny"}
            </div>
            <div
              className="font-barlow font-black text-[18px]"
              style={{ color: "var(--gg-text)" }}
            >
              {workout.workoutName || "Trening"}
            </div>
          </div>

          <button
            onClick={handleDeleteWorkout}
            className="text-[13px] font-bold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-error)" }}
          >
            Usuń
          </button>
        </div>

        {/* Timer card (DRAFT) / Unified info card (COMPLETED) */}
        {!isCompleted ? (
          <>
            {/* Timer card */}
            <div
              className="mb-4 rounded-[22px]"
              style={{ padding: "18px 20px", background: "var(--gg-surface)", border: "1.5px solid var(--gg-border)" }}
            >
              {!isEditingInfo && !isEditingNotes ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.10em] mb-1.5" style={{ color: "var(--gg-text-muted)" }}>
                      Czas treningu
                    </div>
                    <div
                      className="font-barlow-condensed font-black leading-none mb-3"
                      style={{ fontSize: 52, color: "var(--gg-text)", letterSpacing: "-0.02em" }}
                    >
                      {fmtTimer(elapsed)}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={handleStartEditInfo}
                      className="flex items-center gap-2 border-none cursor-pointer rounded-[10px]"
                      style={{ padding: "7px 12px", background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
                      </svg>
                      <span className="text-[12px] font-semibold">Edytuj</span>
                    </button>
                    <button
                      onClick={handleStartEditNotes}
                      className="flex items-center gap-2 border-none cursor-pointer rounded-[10px]"
                      style={{ padding: "7px 12px", background: "var(--gg-surface2)", color: "var(--gg-text-sub)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                        <path d="M9 12h6M9 16h4"/>
                      </svg>
                      <span className="text-[12px] font-semibold">Notatki</span>
                    </button>
                    {planProgress && (
                      <div
                        className="flex items-center gap-2 rounded-[10px]"
                        style={{ padding: "7px 12px", background: "var(--gg-active-bg)", color: "var(--gg-active-border)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                          <rect x="9" y="3" width="6" height="4" rx="1"/>
                          <line x1="9" y1="12" x2="15" y2="12"/>
                          <line x1="9" y1="16" x2="13" y2="16"/>
                        </svg>
                        <span className="text-[12px] font-bold">Plan {planProgress.done}/{planProgress.total}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : isEditingInfo ? (
                <div className="flex flex-col gap-3.5">
                  <h3 className="text-[14px] font-bold m-0" style={{ color: "var(--gg-text)" }}>Edytuj dane</h3>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Nazwa treningu</label>
                    <input type="text" value={editWorkoutName} onChange={(e) => setEditWorkoutName(e.target.value)} placeholder="np. Trening nóg" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Siłownia</label>
                    <input type="text" value={editGymName} onChange={(e) => setEditGymName(e.target.value)} placeholder="np. McFit" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Data treningu</label>
                    <input type="date" value={editWorkoutDate} onChange={(e) => setEditWorkoutDate(e.target.value)} max={new Date().toISOString().split("T")[0]} style={inputStyle} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setIsEditingInfo(false)} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}>Anuluj</button>
                    <button onClick={handleSaveWorkoutInfo} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer text-white border-none" style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}>Zapisz</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Notatki do treningu</label>
                    <textarea value={editWorkoutNotes} onChange={(e) => setEditWorkoutNotes(e.target.value)} placeholder="Dodaj notatki do treningu..." rows={4} autoFocus style={{ ...inputStyle, resize: "none" }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingNotes(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}>Anuluj</button>
                    <button onClick={handleSaveWorkoutNotes} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white border-none" style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}>Zapisz notatki</button>
                  </div>
                </div>
              )}
            </div>

            {/* Workout notes display */}
            {workout.workoutNotes && !isEditingNotes && (
              <div
                className="mb-3 rounded-[14px]"
                style={{ padding: "10px 14px", background: "var(--gg-surface)", border: "1.5px solid var(--gg-border)" }}
              >
                <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--gg-text-muted)" }}>Notatki</span>
                <p className="text-[13px] mt-1 whitespace-pre-wrap" style={{ color: "var(--gg-text)" }}>{workout.workoutNotes}</p>
              </div>
            )}

            {/* Plan banner — next exercise */}
            {activePlan && nextFromPlan && (
              <div className="mb-3 flex rounded-[14px] overflow-hidden" style={{ boxShadow: "0 4px 16px var(--gg-active-glow)" }}>
                <button
                  onClick={() => handleAddFromPlan(nextFromPlan.exerciseId)}
                  className="flex-1 flex items-center gap-2.5 border-none cursor-pointer"
                  style={{ padding: "13px 16px", background: "var(--gg-active-border)", color: "white", minWidth: 0 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="9" y1="16" x2="13" y2="16"/>
                  </svg>
                  <span className="font-bold text-[14px] text-left truncate">{nextFromPlan.exercise.name}</span>
                </button>
                <button
                  onClick={() => handleSkipPlanExercise(nextFromPlan.exerciseId)}
                  className="flex items-center gap-1.5 border-none cursor-pointer flex-shrink-0"
                  style={{ padding: "13px 14px", background: "rgba(0,0,0,0.22)", borderLeft: "1px solid rgba(255,255,255,0.18)", color: "white" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/>
                    <line x1="19" y1="5" x2="19" y2="19"/>
                  </svg>
                  <span className="text-[12px] font-bold">pomiń</span>
                </button>
              </div>
            )}

            {/* Plan completed indicator */}
            {activePlan && !nextFromPlan && (
              <div
                className="mb-3 flex items-center justify-center gap-2 rounded-[14px]"
                style={{ padding: "12px 16px", background: "var(--gg-active-bg)", border: "1.5px solid var(--gg-active-border)", color: "var(--gg-active-border)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-9"/>
                </svg>
                <span className="text-[12px] font-bold">Plan ukończony</span>
              </div>
            )}
          </>
        ) : (
          /* Unified card — COMPLETED */
          <div
            className="mb-4 rounded-[18px]"
            style={{
              padding: isEditMode ? "20px 20px" : "14px 16px",
              background: "var(--gg-surface)",
              border: "1.5px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            {!isEditMode ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Czas treningu</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--gg-a2)" }}>{fmtDuration(workout.durationSeconds)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Godzina</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
                    {new Date(workout.workoutDate).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    {workout.durationSeconds ? ` – ${new Date(new Date(workout.workoutDate).getTime() + workout.durationSeconds * 1000).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Data</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>{fmtDate(workout.workoutDate)}</span>
                </div>
                {workout.gymName && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Siłownia</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>{workout.gymName}</span>
                  </div>
                )}
                {workout.workoutNotes && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--gg-border)" }}>
                    <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--gg-text-muted)" }}>Notatki</span>
                    <p className="text-[13px] mt-1 whitespace-pre-wrap" style={{ color: "var(--gg-text)" }}>{workout.workoutNotes}</p>
                  </div>
                )}
                <div className="flex justify-end mt-3 pt-2" style={{ borderTop: "1px solid var(--gg-border)" }}>
                  <button
                    onClick={handleStartEditCompleted}
                    className="flex items-center gap-1.5 text-[13px] font-semibold border-none bg-transparent cursor-pointer"
                    style={{ color: "var(--gg-a2)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Edytuj
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3.5">
                <h3 className="text-[14px] font-bold m-0" style={{ color: "var(--gg-text)" }}>Edytuj trening</h3>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Nazwa treningu</label>
                  <input type="text" value={editWorkoutName} onChange={(e) => setEditWorkoutName(e.target.value)} placeholder="np. Trening nóg" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Siłownia</label>
                  <input type="text" value={editGymName} onChange={(e) => setEditGymName(e.target.value)} placeholder="np. McFit" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Data treningu</label>
                  <input type="date" value={editWorkoutDate} onChange={(e) => setEditWorkoutDate(e.target.value)} max={new Date().toISOString().split("T")[0]} style={inputStyle} />
                </div>
                <div className="pt-2" style={{ borderTop: "1px solid var(--gg-border)" }}>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Notatki</label>
                  <textarea value={editWorkoutNotes} onChange={(e) => setEditWorkoutNotes(e.target.value)} placeholder="Dodaj notatki do treningu..." rows={2} style={{ ...inputStyle, resize: "none" }} />
                </div>
                <div className="pt-2" style={{ borderTop: "1px solid var(--gg-border)" }}>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--gg-text-sub)" }}>Czas trwania</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] mb-1" style={{ color: "var(--gg-text-muted)" }}>Rozpoczęcie</label>
                      <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} style={inputStyle} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] mb-1" style={{ color: "var(--gg-text-muted)" }}>Zakończenie</label>
                      <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  {editedDurationSeconds !== null && (
                    <p className="text-[12px] mt-1.5 font-semibold" style={{ color: "var(--gg-a2)" }}>
                      Czas treningu: {fmtDuration(editedDurationSeconds)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setIsEditMode(false)} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}>Anuluj</button>
                  <button onClick={handleSaveCompletedEdits} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer text-white border-none" style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}>Zapisz</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {canEditWorkout && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 font-bold rounded-[14px] cursor-pointer border-none"
              style={{ padding: "13px 8px", background: "var(--gg-surface2)", color: "var(--gg-text)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
              <span className="text-[13px]">Dodaj ćwiczenie</span>
            </button>
            <button
              onClick={isEditMode ? () => setIsEditMode(false) : handleCompleteWorkout}
              className="flex-1 flex items-center justify-center gap-2 font-bold rounded-[14px] cursor-pointer border-none"
              style={{ padding: "13px 8px", background: "var(--gg-surface2)", color: "var(--gg-text)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-9"/>
              </svg>
              <span className="text-[13px]">{isEditMode ? "Zapisz edycję" : "Zakończ trening"}</span>
            </button>
          </div>
        )}

        {/* Exercise list */}
        <div className="flex flex-col gap-3 pb-4">
          {workout.items.length === 0 ? (
            <div
              className="flex flex-col items-center py-10 text-center rounded-[20px]"
              style={{ background: "var(--gg-surface)" }}
            >
              <div
                className="flex items-center justify-center w-16 h-16 rounded-[20px] mb-3"
                style={{ background: "var(--gg-surface2)", boxShadow: "var(--gg-shadow)" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8.5" y1="12" x2="15.5" y2="12"/>
                  <line x1="5" y1="8.5" x2="5" y2="15.5"/>
                  <line x1="7.5" y1="7" x2="7.5" y2="17"/>
                  <line x1="16.5" y1="7" x2="16.5" y2="17"/>
                  <line x1="19" y1="8.5" x2="19" y2="15.5"/>
                </svg>
              </div>
              <p className="text-[15px] font-bold mb-1" style={{ color: "var(--gg-text)" }}>
                Brak ćwiczeń w tym treningu
              </p>
              {!isCompleted && (
                <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
                  Użyj przycisku powyżej aby dodać ćwiczenie
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
                isEditMode={isEditMode}
                isExpanded={expandedItemId === item.id}
                stats={allStats.find((s) => s.exerciseId === item.exerciseId)}
                lastSetsSummary={latestSetsByExerciseId.get(item.exerciseId)}
                lastExerciseNote={item.previousNote ?? undefined}
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
    </>
  );
}
