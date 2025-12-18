import { memo } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState } from '@/components/ui'
import { DumbbellIcon, PlusIcon } from '@/components/icons'
import type { Exercise } from '@/hooks'

interface ExercisesScreenProps {
  onAddExercise: () => void
  exercises: Exercise[]
}

export const ExercisesScreen = memo(function ExercisesScreen({
  onAddExercise,
  exercises,
}: ExercisesScreenProps) {
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
        {exercises.length > 0 ? (
          <ul className="space-y-4">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="p-4 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{exercise.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{exercise.musclePart}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Brak zapisanych ćwiczeń"
            description="Dodaj swoje ulubione ćwiczenia"
            icon={<DumbbellIcon className="w-12 h-12" />}
          />
        )}
      </div>
    </ScreenContainer>
  )
})
