export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Pectoraux' },
  { value: 'back', label: 'Dos' },
  { value: 'shoulders', label: 'Épaules' },
  { value: 'arms', label: 'Bras' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Jambes' },
  { value: 'quads', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Ischio-jambiers' },
  { value: 'glutes', label: 'Fessiers' },
  { value: 'calves', label: 'Mollets' },
  { value: 'core', label: 'Abdominaux' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full_body', label: 'Corps complet' },
] as const

export const EQUIPMENT_TYPES = [
  { value: 'barbell', label: 'Barre' },
  { value: 'dumbbell', label: 'Haltères' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Câble' },
  { value: 'bodyweight', label: 'Poids de corps' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'resistance_band', label: 'Élastique' },
  { value: 'other', label: 'Autre' },
] as const

export const REST_PRESETS = [30, 45, 60, 90, 120, 180] // in seconds

export const FEELING_LABELS: Record<number, string> = {
  1: 'Très difficile',
  2: 'Difficile',
  3: 'Moyen',
  4: 'Facile',
  5: 'Très facile',
}

export const FEELING_EMOJIS: Record<number, string> = {
  1: '😓',
  2: '😤',
  3: '😐',
  4: '😊',
  5: '💪',
}

export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: 'bg-red-500/20 text-red-300',
  back: 'bg-blue-500/20 text-blue-300',
  shoulders: 'bg-yellow-500/20 text-yellow-300',
  arms: 'bg-purple-500/20 text-purple-300',
  biceps: 'bg-purple-500/20 text-purple-300',
  triceps: 'bg-pink-500/20 text-pink-300',
  legs: 'bg-green-500/20 text-green-300',
  quads: 'bg-green-500/20 text-green-300',
  hamstrings: 'bg-emerald-500/20 text-emerald-300',
  glutes: 'bg-orange-500/20 text-orange-300',
  calves: 'bg-lime-500/20 text-lime-300',
  core: 'bg-cyan-500/20 text-cyan-300',
  cardio: 'bg-rose-500/20 text-rose-300',
  full_body: 'bg-indigo-500/20 text-indigo-300',
}
