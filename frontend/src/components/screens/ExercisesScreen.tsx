import { memo, useState } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState, FilterChip } from '../ui'
import { DumbbellIcon, PlusIcon, EditIcon, TrashIcon } from '../icons'
import { useExercises, type Exercise } from '../../hooks/useExercises'
import { MUSCLE_GROUPS } from '../../constants' 

interface ExercisesScreenProps {
  onAddExercise: () => void
  onEditExercise: (exercise: Exercise) => void
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
        subtitle={`${exercises.length} ${exercises.length === 1 ? 'ćwiczenie' : 'ćwiczeń'}`}
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

      {/* Filtry - poziomy scroll */}
      <div className="mt-6 -mx-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Filtruj według partii
          </h3>
          {selectedMuscleGroup && (
            <button
              onClick={clearFilters}
              className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium"
            >
              ✕ Wyczyść
            </button>
          )}
        </div>

        {/* Poziomy scroll */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="flex gap-2 pb-2 min-w-min">
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
      </div>
      
      {/* Lista ćwiczeń */}
      <div className="mt-6">
        {exercises.length === 0 ? (
          <EmptyState 
            title={selectedMuscleGroup ? "Brak ćwiczeń dla tej partii" : "Brak zapisanych ćwiczeń"}
            description={selectedMuscleGroup ? "Spróbuj wybrać inną grupę mięśniową lub dodaj nowe ćwiczenie" : "Dodaj swoje pierwsze ćwiczenie klikając przycisk powyżej"}
            icon={<DumbbellIcon className="w-12 h-12" />}
          />
        ) : (
          <ul className="space-y-3">
            {exercises.map(exercise => (
              <li 
                key={exercise.id} 
                className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {exercise.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exercise.muscleGroups.map(mg => {
                        const group = MUSCLE_GROUPS.find(g => g.value === mg)
                        return (
                          <span 
                            key={mg}
                            className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
                          >
                            {group?.label || mg}
                          </span>
                        )
                      })}
                    </div>
                    {exercise.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {exercise.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Dodane przez: {exercise.creator.firstName} {exercise.creator.lastName}
                    </p>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditExercise(exercise)}  
                      className="p-2 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Edytuj"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id, exercise.name)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
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
