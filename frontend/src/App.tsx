import { useNavigation, useWorkout, useExercises } from './hooks'
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
  AddExerciseScreen,
} from './components'

function App() {
  const { activeTab, setActiveTab, screen, setScreen } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()
  const { addExercise } = useExercises()  // ✅ Tylko addExercise na poziomie App

  const renderScreen = () => {
    if (screen === 'add-exercise') {
      return (
        <AddExerciseScreen
          onBack={() => setScreen('exercises')}
          onAddExercise={addExercise}  // ✅ Przekaż funkcję do dodawania
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
            // ❌ USUŃ exercises={exercises}
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
