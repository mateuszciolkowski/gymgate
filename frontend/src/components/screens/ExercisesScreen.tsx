import { memo } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState } from '@/components/ui'
import { DumbbellIcon } from '@/components/icons'

export const ExercisesScreen = memo(function ExercisesScreen() {
  return (
    <ScreenContainer>
        
      <ScreenHeader title="Moje ćwiczenia" subtitle="Zarządzaj swoimi ćwiczeniami" />
      
      <div className="mt-6">
        <EmptyState
          title="Brak zapisanych ćwiczeń"
          description="Dodaj swoje ulubione ćwiczenia"
          icon={<DumbbellIcon className="w-12 h-12" />}
        />
      </div>
    </ScreenContainer>
  )
})
