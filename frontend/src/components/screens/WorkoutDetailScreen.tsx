import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useWorkoutData, WorkoutNotFoundError } from "@/contexts/DataContext";
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

function fmtTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "Brak danych";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  fontSize: 14,
  color: "var(--gg-text)",
  background: "var(--gg-surface2)",
  border: "1.5px solid var(--gg-border)",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};

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
    setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));

    timerRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

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
    () => [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout),
    [workout.items],
  );

  const activePlan = useMemo(
    () => (workout.workoutPlanId ? plans.find((p) => p.id === workout.workoutPlanId) : undefined),
    [workout.workoutPlanId, plans],
  );

  const nextFromPlan = useMemo(() => {
    if (!activePlan) return null;
    const addedIds = new Set(workout.items.map((i) => i.exerciseId));
    const skippedIds = new Set(workout.skippedPlanExerciseIds ?? []);
    return (
      [...activePlan.items]
        .sort((a, b) => a.orderInPlan - b.orderInPlan)
        .find((item) => !addedIds.has(item.exerciseId) && !skippedIds.has(item.exerciseId)) ?? null
    );
  }, [activePlan, workout.items, workout.skippedPlanExerciseIds]);

  const planProgress = useMemo(() => {
    if (!activePlan) return null;
    const addedFromPlan = workout.items.filter((i) =>
      activePlan.items.some((pi) => pi.exerciseId === i.exerciseId),
    ).length;
    return { done: addedFromPlan, total: activePlan.items.length };
  }, [activePlan, workout.items]);

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
                <div className="flex flex-col gap-3">
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
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setIsEditingInfo(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}>Anuluj</button>
                    <button onClick={handleSaveWorkoutInfo} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white border-none" style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}>Zapisz</button>
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
              padding: "14px 16px",
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
              <div className="flex flex-col gap-3">
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
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Notatki</label>
                  <textarea value={editWorkoutNotes} onChange={(e) => setEditWorkoutNotes(e.target.value)} placeholder="Dodaj notatki do treningu..." rows={3} style={{ ...inputStyle, resize: "none" }} />
                </div>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Rozpoczęcie</label>
                      <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} style={inputStyle} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>Zakończenie</label>
                      <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  {editedDurationSeconds !== null && (
                    <p className="text-[12px] mt-1.5 font-semibold" style={{ color: "var(--gg-a2)" }}>
                      Czas treningu: {fmtDuration(editedDurationSeconds)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setIsEditMode(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}>Anuluj</button>
                  <button onClick={handleSaveCompletedEdits} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white border-none" style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}>Zapisz</button>
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

// ─── SetRowEditable ─────────────────────────────────────────────────────────

function SetRowEditable({
  set,
  itemId,
  onSave,
  onDelete,
}: {
  set: WorkoutSet;
  itemId: string;
  onSave: (setId: string, data: { weight?: number; repetitions?: number }) => void;
  onDelete: (itemId: string, setId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.repetitions.toString());
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setWeight(set.weight);
      setReps(set.repetitions.toString());
    }
  }, [set.weight, set.repetitions, isEditing]);

  const handleAccept = () => {
    const nextWeight = Number(weight);
    const nextReps = Number(reps);
    if (isNaN(nextWeight) || isNaN(nextReps) || nextWeight < 0 || nextReps < 1) {
      setEditError("Podaj prawidłowe wartości (kg ≥ 0, powt. ≥ 1)");
      return;
    }
    setEditError(null);
    const payload: { weight?: number; repetitions?: number } = {};
    if (nextWeight !== Number(set.weight)) payload.weight = nextWeight;
    if (nextReps !== set.repetitions) payload.repetitions = nextReps;
    if (Object.keys(payload).length > 0) onSave(set.id, payload);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setWeight(set.weight);
    setReps(set.repetitions.toString());
    setEditError(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
      onDelete(itemId, set.id);
    }
  };

  const rowBg = { padding: "10px 10px", background: "var(--gg-surface2)" };
  const inputStyle = { padding: "8px 6px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text)", outline: "none" };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 w-full rounded-[10px]" style={rowBg}>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-text-muted)" }}>
            #{set.setNumber}
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="number"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setEditError(null); }}
              step="0.5"
              min="0"
              autoFocus
              className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
              style={inputStyle}
            />
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>kg</span>
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="number"
              value={reps}
              onChange={(e) => { setReps(e.target.value); setEditError(null); }}
              min="1"
              className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
              style={inputStyle}
            />
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>powt.</span>
          </div>
          <button
            onClick={handleAccept}
            className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gg-a1)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-9"/>
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gg-surface3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {editError && (
          <p className="text-[11px] text-center" style={{ color: "var(--gg-danger, #ef4444)" }}>{editError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full rounded-[10px]" style={rowBg}>
      <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-text-muted)" }}>
        #{set.setNumber}
      </span>
      <span className="flex-1 text-[13px]" style={{ color: "var(--gg-text)" }}>
        <strong>{set.weight}</strong> <span style={{ color: "var(--gg-text-muted)" }}>kg ×</span> <strong>{set.repetitions}</strong> <span style={{ color: "var(--gg-text-muted)" }}>powt.</span>
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gg-surface3)" }}
        title="Edytuj"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button
        onClick={handleDelete}
        className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--gg-surface3)" }}
        title="Usuń"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}

// ─── DraftSetRow ─────────────────────────────────────────────────────────────

function DraftSetRow({
  setNumber,
  defaultWeight,
  defaultReps,
  onConfirm,
  onCancel,
}: {
  setNumber: number;
  defaultWeight: string;
  defaultReps: string;
  onConfirm: (weight: number, reps: number) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const w = Number(weight);
    const r = Number(reps);
    if (isNaN(w) || isNaN(r) || w < 0 || r < 1) {
      setError("Podaj prawidłowe wartości (kg ≥ 0, powt. ≥ 1)");
      return;
    }
    onConfirm(w, r);
  };

  const inputStyle = { padding: "8px 6px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-a1)", color: "var(--gg-text)", outline: "none" };

  return (
    <div
      className="flex flex-col gap-1 w-full rounded-[10px]"
      style={{ padding: "10px 10px", background: "var(--gg-surface2)", border: "1.5px solid var(--gg-a1)" }}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-[12px] font-bold w-6 flex-shrink-0 text-center" style={{ color: "var(--gg-a1)" }}>
          #{setNumber}
        </span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="number"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }}
            step="0.5"
            min="0"
            autoFocus
            className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
            style={inputStyle}
          />
          <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>kg</span>
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="number"
            value={reps}
            onChange={(e) => { setReps(e.target.value); setError(null); }}
            min="1"
            className="flex-1 min-w-0 rounded-[8px] text-[14px] font-bold text-center"
            style={inputStyle}
          />
          <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>powt.</span>
        </div>
        <button
          onClick={handleConfirm}
          className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--gg-a1)" }}
          title="Zatwierdź"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-9"/>
          </svg>
        </button>
        <button
          onClick={onCancel}
          className="w-9 h-9 rounded-[9px] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--gg-surface3)" }}
          title="Anuluj"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-center" style={{ color: "var(--gg-danger, #ef4444)" }}>{error}</p>
      )}
    </div>
  );
}

// ─── WorkoutItemCard ─────────────────────────────────────────────────────────

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
  onUpdateSet: (setId: string, data: { weight?: number; repetitions?: number }) => void;
  onDeleteSet: (itemId: string, setId: string) => void;
  onAddSet: (itemId: string, data: { weight: number; repetitions: number; setNumber: number }) => void;
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
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesValue, setEditNotesValue] = useState(item.notes ?? "");
    const [displayedNotes, setDisplayedNotes] = useState(item.notes ?? "");
    const [draftSet, setDraftSet] = useState<{ weight: string; reps: string } | null>(null);

    const canEdit = !isCompleted || isEditMode;
    const noteToDisplay = lastExerciseNote;

    useEffect(() => {
      if (!isEditingNotes) setEditNotesValue(item.notes ?? "");
    }, [item.notes, isEditingNotes]);

    useEffect(() => {
      setDisplayedNotes(item.notes ?? "");
    }, [item.notes]);

    useEffect(() => {
      if (!isExpanded) setDraftSet(null);
    }, [isExpanded]);

    const handleSaveExerciseNotes = async () => {
      const notes = editNotesValue.trim();
      setDisplayedNotes(notes);
      setIsEditingNotes(false);
      await onUpdateExerciseNotes(item.id, notes);
    };

    return (
      <div
        className="overflow-hidden rounded-[20px]"
        style={{
          background: "var(--gg-surface)",
          border: "1.5px solid var(--gg-border)",
          boxShadow: "var(--gg-shadow)",
        }}
      >
        {/* Exercise header */}
        <button
          onClick={() => onToggleExpand(item.id)}
          className="w-full text-left cursor-pointer transition-all duration-150"
          style={{ padding: "14px 16px", background: "none", border: "none" }}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3
                className="font-barlow font-bold text-[14px] leading-snug"
                style={{ color: "var(--gg-text)" }}
              >
                <span className="grad-text mr-1">#{exerciseNumber}</span>
                {item.exercise.name}
              </h3>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {item.exercise.muscleGroups.map((group) => {
                  const mg = MUSCLE_GROUPS.find((m) => m.value === group);
                  return (
                    <span
                      key={group}
                      className="text-[10px] font-bold tracking-[0.06em]"
                      style={{
                        color: "var(--gg-tag-text)",
                        background: "var(--gg-tag-bg)",
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      {mg?.label || group}
                    </span>
                  );
                })}
              </div>
              <p className="text-[12px] mt-1" style={{ color: "var(--gg-text-muted)" }}>
                {item.sets.length} {item.sets.length === 1 ? "seria" : "serie"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteExercise(item.id); }}
                  className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border-none cursor-pointer"
                  style={{ background: "var(--gg-surface2)" }}
                  title="Usuń ćwiczenie"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              )}
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--gg-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div style={{ padding: "0 16px 16px" }}>
            {/* Stats bar */}
            {stats && (
              <div
                className="mb-4 rounded-[12px] p-3"
                style={{ background: "var(--gg-record-bg)" }}
              >
                <div className="flex gap-3 justify-center text-[11px]">
                  <span style={{ color: "var(--gg-text-sub)" }}>
                    Ostatnio: <strong style={{ color: "var(--gg-text)" }}>
                      {lastSetsSummary ?? `${stats.lastWeight} kg × ${stats.lastReps}`}
                    </strong>
                  </span>
                  <div style={{ width: 1, background: "var(--gg-border)" }} />
                  <span style={{ color: "var(--gg-text-sub)" }}>
                    Rekord: <strong className="grad-text">
                      {stats.maxWeight} kg × {stats.maxWeightReps}
                    </strong>
                  </span>
                </div>
                {noteToDisplay && (
                  <>
                    <div style={{ height: 1, background: "var(--gg-border)", margin: "10px 0" }} />
                    <div className="text-[11px] text-center">
                      <span style={{ color: "var(--gg-text-muted)" }}>Notatka z poprzedniego:</span>
                      <p className="mt-0.5 italic" style={{ color: "var(--gg-text)" }}>
                        "{noteToDisplay}"
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sets */}
            {item.sets.length === 0 && !draftSet ? (
              <p className="text-[13px] mb-3" style={{ color: "var(--gg-text-muted)" }}>
                Brak serii. Dodaj pierwszą serię poniżej.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {item.sets.map((set) =>
                  canEdit ? (
                    <SetRowEditable
                      key={set.id}
                      set={set}
                      itemId={item.id}
                      onSave={onUpdateSet}
                      onDelete={onDeleteSet}
                    />
                  ) : (
                    <div
                      key={set.id}
                      className="flex items-center gap-3 rounded-[10px]"
                      style={{ padding: "10px 12px", background: "var(--gg-surface2)" }}
                    >
                      <span className="text-[12px] font-bold w-7 flex-shrink-0" style={{ color: "var(--gg-text-muted)" }}>
                        #{set.setNumber}
                      </span>
                      <span className="flex-1 text-[13px]" style={{ color: "var(--gg-text)" }}>
                        <strong>{set.weight}</strong> <span style={{ color: "var(--gg-text-muted)" }}>kg ×</span> <strong>{set.repetitions}</strong>
                      </span>
                    </div>
                  ),
                )}
                {draftSet && canEdit && (
                  <DraftSetRow
                    setNumber={item.sets.length + 1}
                    defaultWeight={draftSet.weight}
                    defaultReps={draftSet.reps}
                    onConfirm={(w, r) => {
                      onAddSet(item.id, { weight: w, repetitions: r, setNumber: item.sets.length + 1 });
                      setDraftSet(null);
                    }}
                    onCancel={() => setDraftSet(null)}
                  />
                )}
              </div>
            )}

            {/* Bottom actions */}
            {canEdit && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (draftSet) return;
                    const lastSet = item.sets[item.sets.length - 1];
                    setDraftSet({
                      weight: lastSet ? String(Math.max(Number(lastSet.weight), 0)) : "0",
                      reps: lastSet ? String(lastSet.repetitions) : "10",
                    });
                  }}
                  disabled={!!draftSet}
                  className="py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: "2px dashed var(--gg-a1)",
                    color: "var(--gg-a1)",
                    background: "transparent",
                  }}
                >
                  + Dodaj serię
                </button>
                <button
                  onClick={() => setIsEditingNotes((prev) => !prev)}
                  className="py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer"
                  style={{
                    border: "2px dashed var(--gg-border-med)",
                    color: "var(--gg-text-muted)",
                    background: "transparent",
                  }}
                >
                  Notatki
                </button>
              </div>
            )}

            {/* Notes editor */}
            {isEditingNotes && (
              <div
                className="mt-3 rounded-[12px]"
                style={{ padding: "12px", background: "var(--gg-surface2)" }}
              >
                <textarea
                  value={editNotesValue}
                  onChange={(e) => setEditNotesValue(e.target.value)}
                  rows={3}
                  placeholder="Dodaj notatki do tego ćwiczenia..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "var(--gg-text)",
                    background: "var(--gg-surface3)",
                    border: "1.5px solid var(--gg-border)",
                    outline: "none",
                    resize: "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setEditNotesValue(item.notes ?? ""); setIsEditingNotes(false); }}
                    className="flex-1 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer"
                    style={{ background: "var(--gg-surface3)", border: "none", color: "var(--gg-text-muted)" }}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveExerciseNotes}
                    className="flex-1 py-2 rounded-[10px] text-[13px] font-bold cursor-pointer text-white border-none"
                    style={{ background: "var(--gg-grad-btn)" }}
                  >
                    Zapisz notatki
                  </button>
                </div>
              </div>
            )}

            {/* Displayed notes */}
            {displayedNotes && !isEditingNotes && (
              <div
                className="mt-3 rounded-[12px] text-[13px]"
                style={{ padding: "10px 12px", background: "var(--gg-surface2)" }}
              >
                <span className="font-bold" style={{ color: "var(--gg-text-sub)" }}>Notatki:</span>{" "}
                <span style={{ color: "var(--gg-text)" }}>{displayedNotes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;
    if (prevProps.exerciseNumber !== nextProps.exerciseNumber) return false;
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;
    if (prevProps.isEditMode !== nextProps.isEditMode) return false;
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;
    const pi = prevProps.item;
    const ni = nextProps.item;
    if (pi.exerciseId !== ni.exerciseId) return false;
    if (pi.exercise.name !== ni.exercise.name) return false;
    if ((pi.notes ?? null) !== (ni.notes ?? null)) return false;
    if (pi.sets.length !== ni.sets.length) return false;
    for (let i = 0; i < pi.sets.length; i++) {
      const ps = pi.sets[i];
      const ns = ni.sets[i];
      if (ps.setNumber !== ns.setNumber) return false;
      if (ps.weight !== ns.weight) return false;
      if (ps.repetitions !== ns.repetitions) return false;
    }
    const ps = prevProps.stats;
    const ns = nextProps.stats;
    if ((!ps && ns) || (ps && !ns)) return false;
    if (ps && ns) {
      if (ps.maxWeight !== ns.maxWeight) return false;
      if (ps.lastWeight !== ns.lastWeight) return false;
      if (ps.totalWorkouts !== ns.totalWorkouts) return false;
    }
    if (prevProps.lastSetsSummary !== nextProps.lastSetsSummary) return false;
    if ((prevProps.lastExerciseNote ?? null) !== (nextProps.lastExerciseNote ?? null)) return false;
    return true;
  },
);
