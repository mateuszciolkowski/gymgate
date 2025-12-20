import { memo, useState } from 'react'
import { ScreenContainer, ScreenHeader } from '../ui'
import { TrashIcon } from '../icons'
import { MUSCLE_GROUPS } from '../../constants'  

interface AddExerciseScreenProps {
  onBack: () => void
  onAddExercise: (exercise: { name: string; muscleGroups: string[]; description?: string }) => Promise<void>
}

export const AddExerciseScreen = memo(function AddExerciseScreen({ 
  onBack, 
  onAddExercise 
}: AddExerciseScreenProps) {
  const [name, setName] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMuscleGroup = () => {
    setSelectedGroups([...selectedGroups, ''])
  }

  const removeMuscleGroup = (index: number) => {
    setSelectedGroups(selectedGroups.filter((_, i) => i !== index))
  }

  const updateMuscleGroup = (index: number, value: string) => {
    const newGroups = [...selectedGroups]
    newGroups[index] = value
    setSelectedGroups(newGroups)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validGroups = selectedGroups.filter(g => g.trim() !== '')
    
    if (!name.trim() || validGroups.length === 0) {
      setError('Wypełnij nazwę i wybierz przynajmniej jedną grupę mięśniową')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      await onAddExercise({
        name: name.trim(),
        muscleGroups: validGroups,
        description: description.trim() || undefined
      })
      
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd dodawania ćwiczenia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ScreenContainer>
      <ScreenHeader 
        title="Nowe ćwiczenie" 
        subtitle="Dodaj ćwiczenie do swojej bazy"
        onBack={onBack}
      />
      
      <div className="mt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nazwa */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nazwa ćwiczenia
              </label>
              <input 
                type="text" 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="np. Wyciskanie sztangi"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                disabled={isSubmitting}
              />
            </div>

            {/* Grupy mięśniowe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grupy mięśniowe
              </label>
              
              <div className="space-y-2">
                {selectedGroups.map((group, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={group}
                      onChange={(e) => updateMuscleGroup(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Wybierz grupę --</option>
                      {MUSCLE_GROUPS.map(mg => (
                        <option 
                          key={mg.value} 
                          value={mg.value}
                          disabled={selectedGroups.includes(mg.value) && selectedGroups[index] !== mg.value}
                        >
                          {mg.label}
                        </option>
                      ))}
                    </select>
                    
                    {selectedGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMuscleGroup(index)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        disabled={isSubmitting}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {selectedGroups.length < MUSCLE_GROUPS.length && (
                <button
                  type="button"
                  onClick={addMuscleGroup}
                  className="mt-2 text-sm text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
                  disabled={isSubmitting}
                >
                  + Dodaj grupę mięśniową
                </button>
              )}
            </div>

            {/* Opis */}
            <div>
              <label 
                htmlFor="description" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Opis (opcjonalny)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Dodaj opis ćwiczenia..."
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                disabled={isSubmitting}
              />
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
              {isSubmitting ? 'Dodawanie...' : 'Dodaj ćwiczenie'}
            </button>
          </div>
        </form>
      </div>
    </ScreenContainer>
  )
})
