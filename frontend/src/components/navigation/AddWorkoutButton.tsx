import { memo } from 'react'
import { PlusIcon } from '@/components/icons'

interface AddWorkoutButtonProps {
  onClick: () => void
}

export const AddWorkoutButton = memo(function AddWorkoutButton({
  onClick,
}: AddWorkoutButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 rounded-full -mt-6 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:bg-emerald-600 transition-colors touch-manipulation"
      aria-label="Dodaj nowy trening"
    >
      <PlusIcon className="w-7 h-7 sm:w-8 sm:h-8" />
    </button>
  )
})
