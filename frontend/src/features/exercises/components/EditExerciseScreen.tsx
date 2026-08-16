import { memo, useState } from 'react'
import type { Exercise } from "@/types"
import { MUSCLE_GROUPS } from "@/constants"
import { Button, FormField } from "@/components/ui"

interface EditExerciseScreenProps {
  exercise: Exercise
  onBack: () => void
  onUpdate: (id: string, data: { name?: string; muscleGroups?: string[]; description?: string }) => Promise<void>
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  fontSize: 14,
  color: "var(--gg-text)",
  background: "var(--gg-surface)",
  border: "1.5px solid var(--gg-border)",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  boxShadow: "var(--gg-shadow)",
}

export const EditExerciseScreen = memo(function EditExerciseScreen({
  exercise,
  onBack,
  onUpdate
}: EditExerciseScreenProps) {
  const [name, setName] = useState(exercise.name)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(exercise.muscleGroups)
  const [description, setDescription] = useState(exercise.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMuscleGroup = () => setSelectedGroups([...selectedGroups, ''])
  const removeMuscleGroup = (i: number) => setSelectedGroups(selectedGroups.filter((_, idx) => idx !== i))
  const updateMuscleGroup = (i: number, v: string) => {
    const g = [...selectedGroups]
    g[i] = v
    setSelectedGroups(g)
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
      await onUpdate(exercise.id, {
        name: name.trim(),
        muscleGroups: validGroups,
        description: description.trim() || undefined
      })
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd aktualizacji ćwiczenia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-5 pt-5 screen-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] flex-shrink-0 cursor-pointer"
          style={{ background: "var(--gg-surface2)", border: "1px solid var(--gg-border)" }}
          aria-label="Wróć"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h2
            className="font-barlow font-black"
            style={{ fontSize: 26, letterSpacing: "-0.02em", color: "var(--gg-text)", margin: 0, lineHeight: 1 }}
          >
            Edytuj ćwiczenie
          </h2>
          <p className="text-[12px] mt-0.5 m-0" style={{ color: "var(--gg-text-muted)" }}>
            {exercise.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Nazwa ćwiczenia" className="mb-0">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </FormField>

        <FormField label="Grupy mięśniowe" className="mb-0">
          <div className="flex flex-col gap-2">
            {selectedGroups.map((group, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={group}
                  onChange={(e) => updateMuscleGroup(i, e.target.value)}
                  disabled={isSubmitting}
                  style={{ ...fieldStyle, flex: 1 }}
                >
                  <option value="">-- Wybierz grupę --</option>
                  {MUSCLE_GROUPS.map(mg => (
                    <option
                      key={mg.value}
                      value={mg.value}
                      disabled={selectedGroups.includes(mg.value) && selectedGroups[i] !== mg.value}
                    >
                      {mg.label}
                    </option>
                  ))}
                </select>
                {selectedGroups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMuscleGroup(i)}
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-11 rounded-[12px] cursor-pointer flex-shrink-0"
                    style={{ background: "var(--gg-surface)", border: "1.5px solid var(--gg-border)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gg-error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {selectedGroups.length < MUSCLE_GROUPS.length && (
            <button
              type="button"
              onClick={addMuscleGroup}
              disabled={isSubmitting}
              className="mt-2 text-[13px] font-semibold border-none bg-transparent cursor-pointer"
              style={{ color: "var(--gg-a2)" }}
            >
              + Dodaj grupę mięśniową
            </button>
          )}
        </FormField>

        <FormField label="Opis" optional className="mb-0">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Dodaj opis ćwiczenia..."
            disabled={isSubmitting}
            style={{ ...fieldStyle, resize: "none" }}
          />
        </FormField>

        {error && (
          <div
            className="rounded-[12px] text-[13px]"
            style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "var(--gg-error)" }}
          >
            {error}
          </div>
        )}

        <div className="pt-2 pb-6">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            loading={isSubmitting}
            loadingText="Zapisywanie..."
            fullWidth
          >
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </div>
  )
})
