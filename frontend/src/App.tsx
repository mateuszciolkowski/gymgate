import { useState } from 'react'
import { useNavigation, useWorkout, useExercises } from './hooks'
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
import type { Exercise } from './hooks/useExercises'

function App() {
  const { activeTab, setActiveTab, screen, setScreen } = useNavigation('trainings')
  const { startAddWorkout } = useWorkout()
  const { addExercise, updateExercise } = useExercises()
  
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const renderScreen = () => {
    if (screen === 'add-exercise') {
      return (
        <AddExerciseScreen
          onBack={() => setScreen('exercises')}
          onAddExercise={async (data) => {
            try {
              await addExercise(data)
              setScreen('exercises')
            } catch (error) {
              console.error('Błąd dodawania ćwiczenia:', error)
            }
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
          onUpdate={async (id, data) => {
            try {
              await updateExercise(id, data)
              setEditingExercise(null)
              setScreen('exercises')
            } catch (error) {
              console.error('Błąd aktualizacji ćwiczenia:', error)
            }
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
              setEditingExercise(exercise)
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
