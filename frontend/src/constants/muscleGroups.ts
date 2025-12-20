export const MUSCLE_GROUPS = [
  { value: 'CHEST', label: 'Klatka piersiowa' },
  { value: 'BACK', label: 'Plecy' },
  { value: 'SHOULDERS', label: 'Barki' },
  { value: 'BICEPS', label: 'Biceps' },
  { value: 'TRICEPS', label: 'Triceps' },
  { value: 'FOREARMS', label: 'Przedramiona' },
  { value: 'ABS', label: 'Brzuch' },
  { value: 'OBLIQUES', label: 'Skośne brzucha' },
  { value: 'LOWER_BACK', label: 'Dolne plecy' },
  { value: 'QUADS', label: 'Czworogłowy' },
  { value: 'HAMSTRINGS', label: 'Kulszowo-goleniowy' },
  { value: 'GLUTES', label: 'Pośladki' },
  { value: 'CALVES', label: 'Łydki' },
  { value: 'ADDUCTORS', label: 'Przywodziciele' },
  { value: 'HIP_FLEXORS', label: 'Zginacze bioder' },
  { value: 'TRAPS', label: 'Trapez' },
  { value: 'LATS', label: 'Najszersze' },
  { value: 'MIDDLE_BACK', label: 'Środek pleców' },
  { value: 'NECK', label: 'Kark' },
  { value: 'FULL_BODY', label: 'Całe ciało' },
] as const

export type MuscleGroupValue = typeof MUSCLE_GROUPS[number]['value']