import { memo, useState } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState, FilterChip } from '../ui'
import { DumbbellIcon, PlusIcon, EditIcon, TrashIcon } from '../icons'
import { useExercises, type Exercise } from '../../hooks/useExercises'

const MUSCLE_GROUPS = [
  { value: 'CHEST', label: 'Klatka' },
  { value: 'BACK', label: 'Plecy' },
  { value: 'SHOULDERS', label: 'Barki' },
  { value: 'BICEPS', label: 'Biceps' },
  { value: 'TRICEPS', label: 'Triceps' },
  { value: 'FOREARMS', label: 'Przedramiona' },
  { value: 'ABS', label: 'Brzuch' },
  { value: 'QUADS', label: 'Uda' },
  { value: 'HAMSTRINGS', label: 'Dwugłowy' },
  { value: 'GLUTES', label: 'Pośladki' },
  { value: 'CALVES', label: 'Łydki' },
]

interface ExercisesScreenProps {
  onAddExercise: () => void
  onEditExercise: (exercise: Exercise) => void  // ✅ Przekazuj cały obiekt
}

export const ExercisesScreen = memo(function ExercisesScreen({ 
  onAddExercise,
  onEditExercise 
}: ExercisesScreenProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | undefined>(undefined)
  
  const { exercises, loading, error, deleteExercise } = useExercises(
    selectedMuscleGroup ? { muscleGroup: selectedMuscleGroup } : undefined
  )

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć ćwiczenie "${name}"?`)) {
      try {
        await deleteExercise(id)
      } catch (err) {
        alert('Błąd podczas usuwania ćwiczenia')
      }
    }
  }

  const toggleFilter = (muscleGroup: string) => {
    setSelectedMuscleGroup(prev => prev === muscleGroup ? undefined : muscleGroup)
  }

  const clearFilters = () => {
    setSelectedMuscleGroup(undefined)
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Moje ćwiczenia" subtitle="Zarządzaj swoimi ćwiczeniami" />
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Ładowanie...</p>
          </div>
        </div>
      </ScreenContainer>
    )
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Moje ćwiczenia" subtitle="Zarządzaj swoimi ćwiczeniami" />
        <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
          >
            Odśwież
          </button>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <ScreenHeader 
        title="Moje ćwiczenia" 
        subtitle={`${exercises.length} ćwiczeń`}
      />

      {/* Przycisk dodaj */}
      <div className="mt-4 flex justify-center">
        <button 
          onClick={onAddExercise}
          className="flex items-center justify-center w-full max-w-md px-6 py-3 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-md"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Dodaj nowe ćwiczenie
        </button>
      </div>

      {/* Filtry */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtruj po partii
          </h3>
          {selectedMuscleGroup && (
            <button
              onClick={clearFilters}
              className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium"
            >
              Wyczyść
            </button>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {MUSCLE_GROUPS.map(group => (
            <FilterChip
              key={group.value}
              label={group.label}
              isActive={selectedMuscleGroup === group.value}
              onClick={() => toggleFilter(group.value)}
            />
          ))}
        </div>
      </div>
      
      {/* Lista ćwiczeń */}
      <div className="mt-4">
        {exercises.length === 0 ? (
          <EmptyState 
            title={selectedMuscleGroup ? "Brak ćwiczeń dla tej partii" : "Brak zapisanych ćwiczeń"}
            description={selectedMuscleGroup ? "Spróbuj wybrać inną grupę mięśniową" : "Dodaj swoje ulubione ćwiczenia"}
            icon={<DumbbellIcon className="w-12 h-12" />}
          />
        ) : (
          <ul className="space-y-3">
            {exercises.map(exercise => (
              <li 
                key={exercise.id} 
                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {exercise.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {exercise.muscleGroups.map(mg => 
                        MUSCLE_GROUPS.find(g => g.value === mg)?.label || mg
                      ).join(', ')}
                    </p>
                    {exercise.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                        {exercise.description}
                      </p>
                    )}
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium mt-2">
                      {exercise.creator.firstName} {exercise.creator.lastName}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditExercise(exercise)}  
                      className="p-2 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-500 transition-colors"
                      title="Edytuj"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id, exercise.name)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 transition-colors"
                      title="Usuń"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScreenContainer>
  )
})
