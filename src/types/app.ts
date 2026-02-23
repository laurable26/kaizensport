import type { Exercise, Session, SessionExercise, Workout, WorkoutExercise, RunningSession, RunningIntervalBlock, RunningLog } from './database'

// ── Mode application ──────────────────────────────────────────────────────────
export type AppMode = 'musculation' | 'running'

// ── GPS ───────────────────────────────────────────────────────────────────────
export type GpsPoint = {
  lat: number
  lng: number
  alt: number | null     // mètres altitude
  ts: number             // Unix timestamp ms
  speed: number | null   // m/s (depuis GeolocationCoordinates)
  accuracy: number       // mètres de précision
}

// ── Running étendu ────────────────────────────────────────────────────────────
export type RunningSessionWithBlocks = RunningSession & {
  running_interval_blocks: RunningIntervalBlock[]
}

export type RunningLogWithSession = RunningLog & {
  running_sessions: Pick<RunningSession, 'name' | 'type'> | null
}

// Bloc expandé (après expansion des répétitions) pour la course active
export type ExpandedIntervalBlock = RunningIntervalBlock & {
  repetitionIndex: number
  totalRepetitions: number
}

// Stats live calculées pendant une course
export type LiveRunStats = {
  elapsedSeconds: number
  distanceM: number
  currentPaceSecPerKm: number | null
  avgPaceSecPerKm: number | null
  bestPaceSecPerKm: number | null
  elevationGainM: number
  gpsPoints: GpsPoint[]
}

// Distances standards et équivalences en mètres
export const PR_DISTANCES: Record<'5k' | '10k' | 'semi' | 'marathon', number> = {
  '5k': 5000,
  '10k': 10000,
  'semi': 21097,
  'marathon': 42195,
}

// Extended types with relations
export type SessionWithExercises = Session & {
  session_exercises: (SessionExercise & { exercise: Exercise })[]
}

export type WorkoutWithExercises = Workout & {
  workout_exercises: (WorkoutExercise & { exercise: Exercise })[]
}

export type ProgressDataPoint = {
  date: string
  maxWeight: number
  totalVolume: number
  estimatedOneRepMax: number
  sets: number
}

export type ActiveSet = {
  setNumber: number
  weight: number
  reps: number
  feeling: number | null
  restSeconds: number | null
  completedAt: string | null
}

export type ActiveExerciseState = {
  exerciseId: string
  exercise: Exercise
  setsPlanned: number
  restSeconds: number
  completedSets: ActiveSet[]
  repMode: 'reps' | 'duration'
  targetDurationSeconds?: number
}

export type WeekDay = {
  date: Date
  label: string
  isToday: boolean
  events: ScheduledEventWithDetails[]
}

export type ScheduledEventWithDetails = {
  id: string
  plannedDate: string
  plannedTime: string | null
  type: 'session' | 'workout'
  name: string
  sessionId?: string
  workoutId?: string
}
