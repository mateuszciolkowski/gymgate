import { memo, useState } from 'react'
import { MUSCLE_GROUPS } from "@/constants"

interface AddExerciseScreenProps {
  onBack: () => void
  onAddExercise: (exercise: { name: string; muscleGroups: string[]; description?: string; isGlobal?: boolean }) => Promise<void>
  isAdmin?: boolean
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--gg-text-sub)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
}

export const AddExerciseScreen = memo(function AddExerciseScreen({
  onBack,
  onAddExercise,
  isAdmin = false,
}: AddExerciseScreenProps) {
  const [name, setName] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
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
      await onAddExercise({ name: name.trim(), muscleGroups: validGroups, description: description.trim() || undefined, isGlobal: isAdmin ? isGlobal : undefined })
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd dodawania ćwiczenia')
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
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gg-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h2
            className="font-barlow font-black"
            style={{ fontSize: 26, letterSpacing: "-0.02em", color: "var(--gg-text)" }}
          >
            Nowe ćwiczenie
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
            Dodaj ćwiczenie do swojej bazy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label style={labelStyle}>Nazwa ćwiczenia</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="np. Wyciskanie sztangi"
            disabled={isSubmitting}
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Grupy mięśniowe</label>
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
        </div>

        <div>
          <label style={labelStyle}>
            Opis{" "}
            <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
              (opcjonalny)
            </span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Dodaj opis ćwiczenia..."
            disabled={isSubmitting}
            style={{ ...fieldStyle, resize: "none" }}
          />
        </div>

        {isAdmin && (
          <div
            className="flex items-center justify-between rounded-[14px] transition-all duration-200"
            style={{
              padding: "14px 16px",
              background: isGlobal ? "color-mix(in srgb, var(--gg-a2) 6%, var(--gg-surface))" : "var(--gg-surface)",
              border: `1.5px solid ${isGlobal ? "var(--gg-a2)" : "var(--gg-border)"}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
                style={{
                  width: 34,
                  height: 34,
                  background: isGlobal ? "color-mix(in srgb, var(--gg-a2) 15%, transparent)" : "var(--gg-surface2)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isGlobal ? "var(--gg-a2)" : "var(--gg-text-muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--gg-text)" }}>
                  Globalne ćwiczenie
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                  Widoczne dla wszystkich użytkowników
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isGlobal}
              onClick={() => setIsGlobal(v => !v)}
              disabled={isSubmitting}
              className="relative flex-shrink-0 rounded-full transition-colors duration-200"
              style={{
                width: 44,
                height: 26,
                background: isGlobal ? "var(--gg-a2)" : "var(--gg-surface2)",
                border: `1.5px solid ${isGlobal ? "var(--gg-a2)" : "var(--gg-border)"}`,
                cursor: "pointer",
              }}
            >
              <span
                className="absolute rounded-full transition-transform duration-200"
                style={{
                  width: 18,
                  height: 18,
                  background: "white",
                  top: 2,
                  left: 2,
                  transform: isGlobal ? "translateX(18px)" : "translateX(0)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
                }}
              />
            </button>
          </div>
        )}

        {error && (
          <div
            className="rounded-[12px] text-[13px]"
            style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "var(--gg-error)" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-bold text-[15px] text-white rounded-[15px] border-none cursor-pointer disabled:opacity-50"
          style={{
            padding: 15,
            background: "var(--gg-grad-btn)",
            boxShadow: "0 4px 24px var(--gg-glow)",
          }}
        >
          {isSubmitting ? "Dodawanie..." : "Dodaj ćwiczenie"}
        </button>
      </form>
    </div>
  )
})
