import { memo, useState } from 'react'
import { ScreenContainer, ScreenHeader } from 'components/ui'
import { PlusIcon } from 'components/icons'

interface AddExerciseScreenProps {
  onBack: () => void
  onAddExercise: (exercise: { name: string; muscleGroups: string[] }) => Promise<void>
}

export const AddExerciseScreen = memo(function AddExerciseScreen({ 
  onBack, 
  onAddExercise 
}: AddExerciseScreenProps) {
  const [name, setName] = useState('')
  const [muscleGroups, setMuscleGroups] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Dodaj async tutaj
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !muscleGroups.trim()) {
      setError('Wypełnij wszystkie pola')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      await onAddExercise({
        name: name.trim(),
        muscleGroups: muscleGroups.split(',').map(g => g.trim().toUpperCase())
      })
      
      // Po sukcesie wróć do listy
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd dodawania ćwiczenia')
      console.error('Add exercise error:', err)
    } finally {
      setIsSubmitting(false)
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
            {/* Nazwa ćwiczenia */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nazwa ćwiczenia
              </label>
              <input 
                type="text" 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="np. Wyciskanie na ławce"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                disabled={isSubmitting}
              />
            </div>

            {/* Grupy mięśniowe */}
            <div>
              <label 
                htmlFor="muscleGroups" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Grupy mięśniowe (oddzielone przecinkami)
              </label>
              <input 
                type="text" 
                id="muscleGroups" 
                value={muscleGroups} 
                onChange={e => setMuscleGroups(e.target.value)}
                placeholder="CHEST, TRICEPS, SHOULDERS"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Dostępne: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, LEGS, ABS
              </p>
            </div>

            {/* Błąd */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Przycisk */}
          <div className="mt-6">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Dodawanie...
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Dodaj ćwiczenie
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ScreenContainer>
  )
})
