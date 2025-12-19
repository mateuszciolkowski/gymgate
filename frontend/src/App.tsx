import { useNavigation, useWorkout, useExercises } from './hooks'
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
  AddExerciseScreen,
  EditExerciseScreen,  // ✅
} from './components'
import { useState } from 'react'

function App() {
  const { activeTab, setActiveTab, screen, setScreen } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()
  const { addExercise, updateExercise } = useExercises()
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)

  const renderScreen = () => {
    if (screen === 'add-exercise') {
      return (
        <AddExerciseScreen
          onBack={() => setScreen('exercises')}
          onAddExercise={addExercise}
        />
      )
    }

    if (screen === 'edit-exercise' && editingExerciseId) {
      const { exercises } = useExercises()
      const exercise = exercises.find(ex => ex.id === editingExerciseId)
      
      if (!exercise) {
        setScreen('exercises')
        return null
      }

      return (
        <EditExerciseScreen
          exercise={exercise}
          onBack={() => {
            setEditingExerciseId(null)
            setScreen('exercises')
          }}
          onUpdate={updateExercise}
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
            onEditExercise={(id) => {
              setEditingExerciseId(id)
              setScreen('edit-exercise')
            }}
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
