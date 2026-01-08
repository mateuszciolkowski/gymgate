import { memo, useCallback } from 'react'
import type { TabType } from '@/types'
import { ArchiveIcon, DumbbellIcon, ChartIcon, MenuIcon } from '@/components/icons'
import { NavButton } from './NavButton'
import { AddWorkoutButton } from './AddWorkoutButton'

interface BottomNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onAddWorkout: () => void
  isWorkoutDetail?: boolean
}

const navItems = [
  { id: 'trainings' as TabType, label: 'Treningi', icon: ArchiveIcon },
  { id: 'exercises' as TabType, label: 'Ćwiczenia', icon: DumbbellIcon },
  { id: 'stats' as TabType, label: 'Statystyki', icon: ChartIcon },
  { id: 'menu' as TabType, label: 'Menu', icon: MenuIcon },
]

export const BottomNavigation = memo(function BottomNavigation({
  activeTab,
  onTabChange,
  onAddWorkout,
  isWorkoutDetail = false,
}: BottomNavigationProps) {
  const handleTabChange = useCallback(
    (tab: TabType) => {
      onTabChange(tab)
    },
    [onTabChange]
  )

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-300 dark:border-gray-800 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-3 md:rounded-b-3xl z-50 transition-colors"
      role="navigation"
      aria-label="Nawigacja główna"
    >
      <div className="grid grid-cols-5 items-center justify-items-center max-w-xl mx-auto gap-0">
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={!isWorkoutDetail && activeTab === item.id}
            onClick={handleTabChange}
          />
        ))}

        <div className="flex justify-center">
          <AddWorkoutButton
            onClick={onAddWorkout}
            isActive={isWorkoutDetail}
            className="justify-self-center"
          />
        </div>

        {navItems.slice(2).map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={!isWorkoutDetail && activeTab === item.id}
            onClick={handleTabChange}
          />
        ))}
      </div>
    </nav>
  )
})
