export type TabType = 'trainings' | 'exercises' | 'stats' | 'menu'

export interface NavItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
}
