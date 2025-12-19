export type TabType = 'trainings' | 'exercises' | 'stats' | 'menu'
export type Screen = TabType | 'add-exercise' | 'edit-exercise'  // ✅

export interface NavItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
}
