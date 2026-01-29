import { memo } from "react";
import { ScreenContainer, ScreenHeader } from "../ui";
import { PlusIcon } from "../icons";
import { useData } from "@/contexts/DataContext";
import { ExerciseList } from "../exercises/ExerciseList";
import type { Exercise } from "@/hooks/useExercises";

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
      } catch (err) {
        alert("Błąd podczas usuwania ćwiczenia");
      }
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Moje ćwiczenia"
        subtitle="Zarządzaj swoimi ćwiczeniami"
      />

      {/* Przycisk dodaj */}
      <div className="mt-4">
        <button
          onClick={onAddExercise}
          className="flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-md"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Dodaj nowe ćwiczenie
        </button>
      </div>

      {/* Exercise List Component */}
      <div className="mt-4 -mx-5 flex-1">
        <ExerciseList
          mode="manage"
          onEditExercise={onEditExercise}
          onDeleteExercise={handleDelete}
        />
      </div>
    </ScreenContainer>
  );
});
