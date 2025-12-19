import { memo } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState } from '../ui'
import { DumbbellIcon, PlusIcon, EditIcon, TrashIcon } from '../icons'
import { useExercises } from '../../hooks/useExercises'

interface ExercisesScreenProps {
  onAddExercise: () => void
  onEditExercise: (exerciseId: string) => void
}

export const ExercisesScreen = memo(function ExercisesScreen({ 
  onAddExercise,
  onEditExercise 
}: ExercisesScreenProps) {
  const { exercises, loading, error, deleteExercise } = useExercises()

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć ćwiczenie "${name}"?`)) {
      try {
        await deleteExercise(id)
      } catch (err) {
        alert('Błąd podczas usuwania ćwiczenia')
      }
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Moje ćwiczenia" subtitle="Zarządzaj swoimi ćwiczeniami" />
        <div className="mt-6 flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Ładowanie...</p>
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
        subtitle="Zarządzaj swoimi ćwiczeniami"
        action={
          <button 
            onClick={onAddExercise}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Dodaj ćwiczenie
          </button>
        }
      />
      
      <div className="mt-6">
        {exercises.length === 0 ? (
          <EmptyState 
            title="Brak zapisanych ćwiczeń" 
            description="Dodaj swoje ulubione ćwiczenia"
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
                      {exercise.muscleGroups.join(', ')}
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
                      onClick={() => onEditExercise(exercise.id)}
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
