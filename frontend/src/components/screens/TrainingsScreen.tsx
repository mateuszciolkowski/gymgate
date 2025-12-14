import { memo } from 'react'
import { ScreenContainer, ScreenHeader, EmptyState } from '@/components/ui'
import { ArchiveIcon } from '@/components/icons'

export const TrainingsScreen = memo(function TrainingsScreen() {
  return (
    <ScreenContainer>
      <ScreenHeader title="Treningi" subtitle="Historia Twoich treningów" />
      
      <div className="mt-6">
        <EmptyState
          title="Brak zapisanych treningów"
          description="Kliknij + aby dodać pierwszy trening"
          icon={<ArchiveIcon className="w-12 h-12" />}
        />
      </div>
    </ScreenContainer>
  )
})
