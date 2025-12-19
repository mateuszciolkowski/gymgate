import { ScreenContainer, ScreenHeader, EmptyState } from 'components/ui'
import { DumbbellIcon, PlusIcon } from 'components/icons'
import { memo } from 'react'
import { useExercises } from 'hooks'

interface ExercisesScreenProps {
  onAddExercise: () => void
}

export const ExercisesScreen = memo(function ExercisesScreen({ onAddExercise }: ExercisesScreenProps) {
  const { exercises, loading, error } = useExercises()

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
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Dodaj nowe ćwiczenie
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
          <ul className="space-y-4">
            {exercises.map(exercise => (
              <li key={exercise.id} className="p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{exercise.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {exercise.muscleGroups.join(', ')}
                    </p>
                    {exercise.description && (
                      <p className="text-xs text-gray-400 mt-1">{exercise.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">
                    {exercise.creator.name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScreenContainer>
  )
})
