import { useState } from 'react'
import type { TabType, Screen } from '@/types'

interface UseNavigationReturn {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  screen: Screen
  setScreen: (screen: Screen) => void
}

export function useNavigation(initialTab: TabType = 'trainings'): UseNavigationReturn {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [screen, setScreen] = useState<Screen>(initialTab)

  const handleSetActiveTab = (tab: TabType) => {
    setActiveTab(tab)
    setScreen(tab)
  }

  return {
    activeTab,
    setActiveTab: handleSetActiveTab,
    screen,
    setScreen,
  }
}
