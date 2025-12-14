import { memo } from 'react'
import type { TabType } from '@/types'

interface NavButtonProps {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onClick: (id: TabType) => void
}

export const NavButton = memo(function NavButton({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
}: NavButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center p-2 rounded-xl transition-colors min-w-[60px] ${
        isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:text-gray-900 dark:active:text-white'
      }`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  )
})
