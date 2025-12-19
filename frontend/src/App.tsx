// frontend/src/App.tsx
import { useState } from 'react'
import { useNavigation, useWorkout } from './hooks'
import {
  MainLayout,
  BottomNavigation,
  TrainingsScreen,
  ExercisesScreen,
  StatsScreen,
  MenuScreen,
  AddExerciseScreen,
  EditExerciseScreen,
} from './components'
import type { Exercise } from './hooks/useExercises'  // ✅ Import tylko typu

function App() {
  const { activeTab, setActiveTab, screen, setScreen } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()
  
  // ✅ Stan dla edytowanego ćwiczenia
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const renderScreen = () => {
    if (screen === 'add-exercise') {
      return (
        <AddExerciseScreen
          onBack={() => setScreen('exercises')}
          onAddExercise={async (data) => {
            // Hook będzie w ExercisesScreen
            setScreen('exercises')
          }}
        />
      )
    }

    if (screen === 'edit-exercise' && editingExercise) {
      return (
        <EditExerciseScreen
          exercise={editingExercise}
          onBack={() => {
            setEditingExercise(null)
            setScreen('exercises')
          }}
          onUpdate={async () => {
            // Hook będzie w ExercisesScreen
            setEditingExercise(null)
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
            onEditExercise={(exercise) => {
              setEditingExercise(exercise)  // ✅ Przekaż cały obiekt
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
