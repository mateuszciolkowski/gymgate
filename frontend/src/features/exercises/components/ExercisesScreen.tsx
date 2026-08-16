import { memo } from "react";
import { useData } from "@/contexts/data";
import { ExerciseList } from "./ExerciseList";
import type { Exercise } from "@/types";

interface ExercisesScreenProps {
  onAddExercise: () => void;
  onEditExercise: (exercise: Exercise) => void;
}

export const ExercisesScreen = memo(function ExercisesScreen({
  onAddExercise,
  onEditExercise,
}: ExercisesScreenProps) {
  const { deleteExercise } = useData();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć ćwiczenie "${name}"?`)) {
      try {
        await deleteExercise(id);
      } catch {
        alert("Błąd podczas usuwania ćwiczenia");
      }
    }
  };

  return (
    <div className="px-5 pt-6 pb-28 screen-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-0.5"
            style={{ color: "var(--gg-text-muted)" }}
          >
            Twoja baza
          </p>
          <h1
            className="font-barlow font-extrabold text-[30px] tracking-tight leading-none"
            style={{ color: "var(--gg-text)" }}
          >
            Ćwiczenia
          </h1>
        </div>

        <button
          onClick={onAddExercise}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white border-none cursor-pointer transition-transform active:scale-95 shadow-sm"
          style={{ background: "var(--gg-btn-bg)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nowe ćwiczenie
        </button>
      </div>

      {/* Exercise list */}
      <div className="-mx-5">
        <ExerciseList
          mode="manage"
          onEditExercise={onEditExercise}
          onDeleteExercise={handleDelete}
        />
      </div>
    </div>
  );
});
