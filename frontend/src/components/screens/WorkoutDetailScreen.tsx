import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
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

  // Timer state — seconds elapsed since workout was created
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const workoutRef = useRef(workout);
  workoutRef.current = workout;

  // Start timer when workout is DRAFT
  useEffect(() => {
    if (!workout || workout.status !== "DRAFT") return;

    const startedAt = new Date(workout.createdAt).getTime();
    const initialElapsed = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(Math.max(0, initialElapsed));

    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workout?.id, workout?.status]);

  const handleAddExercise = useCallback(
    (exerciseId: string) => {
      if (!workoutRef.current) return;
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
    } catch {
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
    } catch {
      setIsEditingNotes(true);
      alert("Nie udało się zapisać notatek");
    }
  };

  const handleDeleteWorkout = async () => {
    if (confirm("Czy na pewno chcesz usunąć ten trening? Tej operacji nie można cofnąć.")) {
      try {
        await deleteWorkout(workoutId);
        onBack();
      } catch {
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
      } catch {
        alert("Nie udało się zakończyć treningu");
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
        await addSet(itemId, { weight: defaultWeight, repetitions: defaultReps, setNumber: nextSetNumber });
      } catch {}
    },
    [addSet],
  );

  const handleDeleteSet = useCallback(
    async (itemId: string, setId: string) => {
      if (confirm("Czy na pewno chcesz usunąć tę serię?")) {
        try { await deleteSet(itemId, setId); } catch {}
      }
    },
    [deleteSet],
  );

  const handleUpdateSet = useCallback(
    async (setId: string, data: { weight?: number; repetitions?: number }) => {
      try { await updateSet(setId, data); } catch {}
    },
    [updateSet],
  );

  const handleDeleteExercise = useCallback(
    async (itemId: string) => {
      if (confirm("Czy na pewno chcesz usunąć to ćwiczenie z treningu?")) {
        try { await deleteExercise(itemId); } catch {}
      }
    },
    [deleteExercise],
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

        {/* Timer / Duration hero card */}
        {!isCompleted ? (
          <div
            className="relative overflow-hidden mb-4 rounded-[22px]"
            style={{
              padding: 20,
              background: "var(--gg-grad)",
              boxShadow: "0 8px 36px var(--gg-glow)",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{ right: -20, top: -20, width: 100, height: 100, background: "rgba(255,255,255,0.07)" }}
            />
            <div className="relative">
              <div
                className="text-[11px] font-bold uppercase tracking-[0.10em] mb-1"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Czas treningu
              </div>
              <div
                className="font-barlow-condensed font-black leading-none mb-2"
                style={{ fontSize: 52, color: "#fff", letterSpacing: "-0.02em" }}
              >
                {fmtTimer(elapsed)}
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <span className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                    W trakcie
                  </span>
                </div>
                {workout.gymName && (
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                      {workout.gymName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mb-4 rounded-[18px]"
            style={{
              padding: "14px 16px",
              background: "var(--gg-surface)",
              border: "1.5px solid var(--gg-border)",
              boxShadow: "var(--gg-shadow)",
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Czas treningu</span>
              <span className="text-[13px] font-bold" style={{ color: "var(--gg-a2)" }}>
                {fmtDuration(workout.durationSeconds)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Data</span>
              <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
                {fmtDate(workout.workoutDate)}
              </span>
            </div>
            {workout.gymName && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Siłownia</span>
                <span className="text-[13px] font-bold" style={{ color: "var(--gg-text)" }}>
                  {workout.gymName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Info card (editable) */}
        <div
          className="mb-4 rounded-[18px]"
          style={{
            padding: "14px 16px",
            background: "var(--gg-surface)",
            border: "1.5px solid var(--gg-border)",
            boxShadow: "var(--gg-shadow)",
          }}
        >
          {!isEditingInfo && !isEditingNotes ? (
            <>
              {!isCompleted && (
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>Status</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--gg-active-border)" }}>
                    W trakcie
                  </span>
                </div>
              )}
              {workout.workoutNotes && (
                <div className="mb-3">
                  <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--gg-text-muted)" }}>
                    Notatki
                  </span>
                  <p className="text-[13px] mt-1 whitespace-pre-wrap" style={{ color: "var(--gg-text)" }}>
                    {workout.workoutNotes}
                  </p>
                </div>
              )}
              {canEditWorkout && (
                <div className="flex gap-4 mt-1">
                  <button
                    onClick={handleStartEditInfo}
                    className="flex items-center gap-1.5 text-[13px] font-semibold border-none bg-transparent cursor-pointer"
                    style={{ color: "var(--gg-a2)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Edytuj
                  </button>
                  <button
                    onClick={handleStartEditNotes}
                    className="flex items-center gap-1.5 text-[13px] font-semibold border-none bg-transparent cursor-pointer"
                    style={{ color: "var(--gg-a2)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Notatki
                  </button>
                  {isCompleted && (
                    <button
                      onClick={() => { setIsEditMode(!isEditMode); setIsEditingInfo(false); setIsEditingNotes(false); }}
                      className="text-[13px] font-semibold border-none bg-transparent cursor-pointer ml-auto"
                      style={{ color: "var(--gg-text-muted)" }}
                    >
                      {isEditMode ? "Anuluj edycję" : "Tryb edycji"}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : isEditingInfo ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
                  Nazwa treningu
                </label>
                <input type="text" value={editWorkoutName} onChange={(e) => setEditWorkoutName(e.target.value)} placeholder="np. Trening nóg" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
                  Siłownia
                </label>
                <input type="text" value={editGymName} onChange={(e) => setEditGymName(e.target.value)} placeholder="np. McFit" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
                  Data treningu
                </label>
                <input
                  type="date"
                  value={editWorkoutDate}
                  onChange={(e) => setEditWorkoutDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                  style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveWorkoutInfo}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white border-none"
                  style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}
                >
                  Zapisz
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--gg-text-sub)" }}>
                  Notatki do treningu
                </label>
                <textarea
                  value={editWorkoutNotes}
                  onChange={(e) => setEditWorkoutNotes(e.target.value)}
                  placeholder="Dodaj notatki do treningu..."
                  rows={4}
                  autoFocus
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                  style={{ background: "var(--gg-surface2)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text-sub)" }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveWorkoutNotes}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer text-white border-none"
                  style={{ background: "var(--gg-grad-btn)", boxShadow: "0 3px 14px var(--gg-glow)" }}
                >
                  Zapisz notatki
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canEditWorkout && (
          <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: "1fr 1.3fr" }}>
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="flex items-center justify-center gap-1.5 font-bold text-[14px] rounded-[16px] cursor-pointer"
              style={{
                padding: 14,
                background: "var(--gg-surface2)",
                border: "1.5px solid var(--gg-border)",
                color: "var(--gg-text)",
                boxShadow: "var(--gg-shadow)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="4" x2="12" y2="20"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
              Dodaj ćwiczenie
            </button>
            <button
              onClick={isEditMode ? () => setIsEditMode(false) : handleCompleteWorkout}
              className="flex items-center justify-center gap-1.5 font-bold text-[14px] rounded-[16px] cursor-pointer text-white border-none"
              style={{
                padding: 14,
                background: "var(--gg-grad-btn)",
                boxShadow: "0 4px 20px var(--gg-glow)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-9"/>
              </svg>
              {isEditMode ? "Zapisz zmiany" : "Zakończ trening"}
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
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="5" x2="18" y2="5"/><line x1="6" y1="19" x2="18" y2="19"/>
                  <line x1="4" y1="8" x2="4" y2="16"/><line x1="20" y1="8" x2="20" y2="16"/>
                  <line x1="2" y1="10" x2="2" y2="14"/><line x1="22" y1="10" x2="22" y2="14"/>
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

// ─── WorkoutItemCard ────────────────────────────────────────────────────────

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
    const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null);
    const [editWeight, setEditWeight] = useState("");
    const [editReps, setEditReps] = useState("");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesValue, setEditNotesValue] = useState(item.notes ?? "");
    const [displayedNotes, setDisplayedNotes] = useState(item.notes ?? "");

    const canEdit = !isCompleted || isEditMode;
    const noteToDisplay = lastExerciseNote;

    useEffect(() => {
      if (!isEditingNotes) setEditNotesValue(item.notes ?? "");
    }, [item.notes, isEditingNotes]);

    useEffect(() => {
      setDisplayedNotes(item.notes ?? "");
    }, [item.notes]);

    const editingSet = editingSetNumber !== null
      ? item.sets.find((s) => s.setNumber === editingSetNumber)
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
      const payload: { weight?: number; repetitions?: number } = {};
      if (nextWeight !== Number(editingSet.weight)) payload.weight = nextWeight;
      if (nextReps !== editingSet.repetitions) payload.repetitions = nextReps;
      if (Object.keys(payload).length > 0) onUpdateSet(editingSet.id, payload);
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
            {item.sets.length === 0 ? (
              <p className="text-[13px] mb-3" style={{ color: "var(--gg-text-muted)" }}>
                Brak serii. Dodaj pierwszą serię poniżej.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {item.sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center gap-3 rounded-[10px]"
                    style={{ padding: "10px 12px", background: "var(--gg-surface2)" }}
                  >
                    <span
                      className="text-[12px] font-bold w-7 flex-shrink-0"
                      style={{ color: "var(--gg-text-muted)" }}
                    >
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
                            autoFocus
                            step="0.5"
                            min="0"
                            className="w-20 rounded-[10px] text-[14px]"
                            style={{ padding: "8px 10px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text)", outline: "none" }}
                          />
                          <input
                            type="number"
                            value={editReps}
                            onChange={(e) => setEditReps(e.target.value)}
                            placeholder="reps"
                            min="1"
                            className="w-16 rounded-[10px] text-[14px]"
                            style={{ padding: "8px 10px", background: "var(--gg-surface3)", border: "1.5px solid var(--gg-border)", color: "var(--gg-text)", outline: "none" }}
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleSaveSet}
                            className="w-8 h-8 rounded-[8px] border-none cursor-pointer text-white text-[14px]"
                            style={{ background: "var(--gg-a1)" }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="w-8 h-8 rounded-[8px] border-none cursor-pointer text-white text-[14px]"
                            style={{ background: "var(--gg-text-muted)" }}
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 flex gap-4">
                          <span className="text-[13px]" style={{ color: "var(--gg-text-sub)" }}>
                            Ciężar: <strong style={{ color: "var(--gg-text)" }}>{set.weight} kg</strong>
                          </span>
                          <span className="text-[13px]" style={{ color: "var(--gg-text-sub)" }}>
                            Powt.: <strong style={{ color: "var(--gg-text)" }}>{set.repetitions}</strong>
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleStartEdit(set)}
                              className="w-8 h-8 rounded-[8px] border-none cursor-pointer flex items-center justify-center"
                              style={{ background: "var(--gg-surface3)" }}
                              title="Edytuj"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-a2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => onDeleteSet(item.id, set.id)}
                              className="w-8 h-8 rounded-[8px] border-none cursor-pointer flex items-center justify-center"
                              style={{ background: "var(--gg-surface3)" }}
                              title="Usuń"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
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

            {/* Bottom actions */}
            {canEdit && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddSet(item.id)}
                  className="py-2.5 rounded-[12px] text-[13px] font-bold cursor-pointer"
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
