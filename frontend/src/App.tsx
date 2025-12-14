import { useNavigation, useWorkout } from '@/hooks'
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
} from '@/components'

function App() {
  const { activeTab, setActiveTab } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()

  const renderScreen = () => {
    switch (activeTab) {
      case 'trainings':
        return <TrainingsScreen />
      case 'exercises':
        return <ExercisesScreen />
      case 'stats':
        return <StatsScreen />
      case 'menu':
        return <MenuScreen />
      default:
        return <TrainingsScreen />
    }
  }

  return (
    <MainLayout
      bottomBar={
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddWorkout={startAddWorkout}
        />
      }
    >
      {renderScreen()}
    </MainLayout>
  )
}

export default App
