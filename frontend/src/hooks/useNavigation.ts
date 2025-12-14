import { useState } from 'react'
import type { TabType } from '@/types'

interface UseNavigationReturn {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export function useNavigation(initialTab: TabType = 'trainings'): UseNavigationReturn {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  return {
    activeTab,
    setActiveTab,
  }
}
