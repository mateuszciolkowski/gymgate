import { memo } from 'react'
import { ScreenContainer, ScreenHeader } from '@/components/ui'
import { ChartIcon } from '@/components/icons'

const mockStats = {
  totalWorkouts: 0,
  thisWeek: 0,
  thisMonth: 0,
  totalTime: '0h',
  favoriteExercise: '-',
  streak: 0,
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
}

const StatCard = memo(function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-5 border border-gray-300 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 dark:text-gray-400 text-sm">{label}</span>
        {icon && <span className="text-emerald-600 dark:text-emerald-500">{icon}</span>}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
})

export const StatsScreen = memo(function StatsScreen() {
  return (
    <ScreenContainer>
      <ScreenHeader title="Statystyki" subtitle="Śledź swoje postępy" />
      
      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="Wszystkie treningi" 
          value={mockStats.totalWorkouts}
          icon={<ChartIcon className="w-5 h-5" />}
        />
        <StatCard 
          label="Ten tydzień" 
          value={mockStats.thisWeek}
        />
        <StatCard 
          label="Ten miesiąc" 
          value={mockStats.thisMonth}
        />
        <StatCard 
          label="Łączny czas" 
          value={mockStats.totalTime}
        />
        <StatCard 
          label="Seria dni" 
          value={`${mockStats.streak} dni`}
        />
        <StatCard 
          label="Ulubione ćwiczenie" 
          value={mockStats.favoriteExercise}
        />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Aktywność tygodniowa</h2>
          <div className="bg-accent-50 dark:bg-gray-900 rounded-xl h-40 flex items-center justify-center border border-gray-300 dark:border-gray-700 transition-colors">
            <p className="text-gray-600 dark:text-gray-500 text-sm">Wykres pojawi się po dodaniu treningów</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Twoje postępy</h2>
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Cel tygodniowy</span>
                <span className="text-emerald-600 dark:text-emerald-500 text-sm font-medium">0/3 treningi</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenContainer>
  )
})
