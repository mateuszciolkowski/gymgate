import { memo, useState } from 'react'
import { MUSCLE_GROUPS } from "@/constants"
import { useAuth } from "@/contexts/AuthContext"
import { Switch, Button, FormField } from "@/components/ui"

interface AddExerciseScreenProps {
  isAdmin?: boolean;
  onBack: () => void;
  onAddExercise: (exercise: { name: string; muscleGroups: string[]; description?: string; isGlobal?: boolean }) => Promise<void>;
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

export const AddExerciseScreen = memo(function AddExerciseScreen({
  isAdmin: propIsAdmin,
  onBack,
  onAddExercise,
}: AddExerciseScreenProps) {
  const { user } = useAuth()
  const isAdmin = propIsAdmin ?? !!user?.isAdmin
  const [name, setName] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
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
    if (!name.trim()) {
      setError('Nazwa ćwiczenia jest wymagana')
      return
    }

    if (validGroups.length === 0) {
      setError('Wybierz przynajmniej jedną grupę mięśniową')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onAddExercise({
        name: name.trim(),
        muscleGroups: validGroups,
        description: description.trim() || undefined,
        isGlobal: isAdmin ? isGlobal : undefined,
      })
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas dodawania ćwiczenia')
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
            style={{ fontSize: 28, letterSpacing: "-0.02em", color: "var(--gg-text)", margin: 0, lineHeight: 1 }}
          >
            Nowe ćwiczenie
          </h2>
          <p className="text-[12px] mt-0.5 m-0" style={{ color: "var(--gg-text-muted)" }}>
            Dodaj ćwiczenie do swojej bazy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Nazwa ćwiczenia" className="mb-0">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="np. Wyciskanie sztangi"
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

        {isAdmin && (
          <Switch
            checked={isGlobal}
            onChange={setIsGlobal}
            disabled={isSubmitting}
            variant="admin"
            badge="ADMIN"
            label="Globalne ćwiczenie"
            description="Widoczne dla wszystkich użytkowników aplikacji"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isGlobal ? "var(--gg-a2)" : "var(--gg-text-muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            }
          />
        )}

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
            loadingText="Dodawanie..."
            fullWidth
          >
            Dodaj ćwiczenie
          </Button>
        </div>
      </form>
    </div>
  )
})
