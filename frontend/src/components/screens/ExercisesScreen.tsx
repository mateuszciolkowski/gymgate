import { memo } from "react";
import { useData } from "@/contexts/data";
import { ExerciseList } from "../exercises/ExerciseList";
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
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="mb-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
          style={{ color: "var(--gg-text-muted)" }}
        >
          Twoja baza
        </p>
        <h1
          className="font-barlow font-black leading-none"
          style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
        >
          Ćwiczenia
        </h1>
      </div>

      {/* Add button */}
      <button
        onClick={onAddExercise}
        className="w-full flex items-center justify-center gap-2 font-bold text-[15px] text-white rounded-[16px] border-none cursor-pointer mb-4"
        style={{
          padding: 15,
          background: "var(--gg-grad-btn)",
          boxShadow: "0 4px 22px var(--gg-glow)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
        Dodaj nowe ćwiczenie
      </button>

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
