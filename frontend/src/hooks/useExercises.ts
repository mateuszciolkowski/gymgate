import { useState, useEffect, useCallback } from 'react'

export interface Exercise {
  id: string
  name: string
  muscleGroups: string[]
  description?: string
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  photos?: Array<{
    id: string
    photoStage: string
    photoUrl: string
  }>
}

interface ExerciseFilters {
  muscleGroup?: string
  name?: string
}

export function useExercises(filters?: ExerciseFilters) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  // Wyciągnij wartości z filters
  const muscleGroup = filters?.muscleGroup
  const name = filters?.name

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Zbuduj URL z query params
      const params = new URLSearchParams()
      if (muscleGroup) params.append('muscleGroup', muscleGroup)
      if (name) params.append('name', name)
      
      const url = `${API_BASE}/api/exercises${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Błąd ładowania ćwiczeń')
      const data = await response.json()
      setExercises(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      console.error('Fetch exercises error:', err)
    } finally {
      setLoading(false)
    }
  }, [API_BASE, muscleGroup, name])

  const addExercise = useCallback(async (exerciseData: Omit<Exercise, 'id' | 'creator' | 'photos'> & { muscleGroups: string[] }) => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE}/api/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: exerciseData.name,
          muscleGroups: exerciseData.muscleGroups,
          description: exerciseData.description || undefined
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd dodawania ćwiczenia')
      }
      
      const newExercise = await response.json()
      setExercises(prev => [newExercise.data, ...prev])
      return newExercise.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      throw err
    }
  }, [API_BASE])

  const updateExercise = useCallback(async (id: string, exerciseData: { name?: string; muscleGroups?: string[]; description?: string }) => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE}/api/exercises/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd aktualizacji ćwiczenia')
      }
      
      const updatedExercise = await response.json()
      setExercises(prev => prev.map(ex => ex.id === id ? updatedExercise.data : ex))
      return updatedExercise.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      throw err
    }
  }, [API_BASE])

  const deleteExercise = useCallback(async (id: string) => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE}/api/exercises/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Błąd usuwania ćwiczenia')
      }
      
      setExercises(prev => prev.filter(ex => ex.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      throw err
    }
  }, [API_BASE])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  return { 
    exercises, 
    loading, 
    error, 
    refetch: fetchExercises,
    addExercise,
    updateExercise,
    deleteExercise,
  }
}
