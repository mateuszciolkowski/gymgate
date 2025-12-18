import { memo, useState } from 'react'
import { ScreenContainer, ScreenHeader } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import type { Exercise } from '@/hooks'
interface AddExerciseScreenProps {
  onBack: () => void
  onAddExercise: (exercise: Omit<Exercise, 'id'>) => void
}

export const AddExerciseScreen = memo(function AddExerciseScreen({
  onBack,
  onAddExercise,
}: AddExerciseScreenProps) {
  const [name, setName] = useState('')
  const [musclePart, setMusclePart] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && musclePart.trim()) {
      onAddExercise({ name, musclePart })
    }
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Dodaj nowe ćwiczenie"
        subtitle="Wypełnij poniższe pola"
        onBack={onBack}
      />
      <div className="mt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nazwa ćwiczenia
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="musclePart" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Partia mięśniowa
              </label>
              <input
                type="text"
                id="musclePart"
                value={musclePart}
                onChange={(e) => setMusclePart(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Dodaj ćwiczenie
            </button>
          </div>
        </form>
      </div>
    </ScreenContainer>
  )
})
