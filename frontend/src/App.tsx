import { useNavigation, useWorkout, useExercises } from '@/hooks'
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
  AddExerciseScreen,
} from '@/components'

function App() {
  const { activeTab, setActiveTab, screen, setScreen } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()
  const { exercises, addExercise } = useExercises()

  const renderScreen = () => {
    if (screen === 'add-exercise') {
      return (
        <AddExerciseScreen
          onBack={() => setScreen('exercises')}
          onAddExercise={(exercise) => {
            addExercise(exercise)
            setScreen('exercises')
          }}
        />
      )
    }

    switch (screen) {
      case 'trainings':
        return <TrainingsScreen />
      case 'exercises':
        return (
          <ExercisesScreen
            onAddExercise={() => setScreen('add-exercise')}
            exercises={exercises}
          />
        )
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
