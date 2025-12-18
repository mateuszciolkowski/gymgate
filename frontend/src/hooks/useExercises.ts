import { useState } from 'react'

export interface Exercise {
  id: string
  name: string
  musclePart: string
}

const initialExercises: Exercise[] = [
  { id: '1', name: 'Wyciskanie na ławce płaskiej', musclePart: 'Klatka piersiowa' },
  { id: '2', name: 'Martwy ciąg', musclePart: 'Plecy' },
  { id: '3', name: 'Przysiady ze sztangą', musclePart: 'Nogi' },
]

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)

  const addExercise = (exercise: Omit<Exercise, 'id'>) => {
    setExercises((prev) => [...prev, { ...exercise, id: Date.now().toString() }])
  }

  return { exercises, addExercise }
}
