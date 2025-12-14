import { useCallback } from 'react'

interface UseWorkoutReturn {
  startAddWorkout: () => void
}

export function useWorkout(): UseWorkoutReturn {
  const startAddWorkout = useCallback(() => {
    console.log('Rozpoczynanie nowego treningu...')
  }, [])

  return {
    startAddWorkout,
  }
}
