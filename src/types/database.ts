// Types Supabase pour l'application Top
// Après avoir créé votre projet Supabase, remplacez ce fichier avec :
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          user_id: string
          name: string
          photo_url: string | null
          notes: string | null
          external_link: string | null
          muscle_group: string | null
          equipment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          photo_url?: string | null
          notes?: string | null
          external_link?: string | null
          muscle_group?: string | null
          equipment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          photo_url?: string | null
          notes?: string | null
          external_link?: string | null
          muscle_group?: string | null
          equipment?: string | null
          updated_at?: string
        }
      }
      exercise_sets: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          weight: number | null
          reps: number | null
          logged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          weight?: number | null
          reps?: number | null
          logged_at?: string
        }
        Update: {
          weight?: number | null
          reps?: number | null
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          name: string
          planned_date: string | null
          planned_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          planned_date?: string | null
          planned_time?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          planned_date?: string | null
          planned_time?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      session_exercises: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          order_index: number
          sets_planned: number
          rest_seconds: number
          target_reps: number | null
          target_weight: number | null
          target_duration_seconds: number | null
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          order_index?: number
          sets_planned?: number
          rest_seconds?: number
          target_reps?: number | null
          target_weight?: number | null
          target_duration_seconds?: number | null
        }
        Update: {
          order_index?: number
          sets_planned?: number
          rest_seconds?: number
          target_reps?: number | null
          target_weight?: number | null
          target_duration_seconds?: number | null
        }
      }
      session_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          started_at: string
          completed_at: string | null
          overall_feeling: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          started_at?: string
          completed_at?: string | null
          overall_feeling?: number | null
          notes?: string | null
        }
        Update: {
          completed_at?: string | null
          overall_feeling?: number | null
          notes?: string | null
        }
      }
      set_logs: {
        Row: {
          id: string
          session_log_id: string
          exercise_id: string
          set_number: number
          weight: number | null
          reps: number | null
          feeling: number | null
          rest_seconds: number | null
          logged_at: string
        }
        Insert: {
          id?: string
          session_log_id: string
          exercise_id: string
          set_number: number
          weight?: number | null
          reps?: number | null
          feeling?: number | null
          rest_seconds?: number | null
          logged_at?: string
        }
        Update: {
          weight?: number | null
          reps?: number | null
          feeling?: number | null
          rest_seconds?: number | null
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          rounds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          rounds?: number
        }
        Update: {
          name?: string
          description?: string | null
          rounds?: number
          updated_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          order_index: number
          duration_seconds: number | null
          reps: number | null
          rest_after_seconds: number
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          order_index?: number
          duration_seconds?: number | null
          reps?: number | null
          rest_after_seconds?: number
        }
        Update: {
          order_index?: number
          duration_seconds?: number | null
          reps?: number | null
          rest_after_seconds?: number
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          app_mode: 'musculation' | 'running' | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          app_mode?: 'musculation' | 'running' | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          app_mode?: 'musculation' | 'running' | null
        }
      }
      running_sessions: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'free' | 'distance' | 'duration' | 'interval'
          target_distance_m: number | null
          target_duration_s: number | null
          warmup_duration_s: number | null
          cooldown_duration_s: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'free' | 'distance' | 'duration' | 'interval'
          target_distance_m?: number | null
          target_duration_s?: number | null
          warmup_duration_s?: number | null
          cooldown_duration_s?: number | null
          notes?: string | null
        }
        Update: {
          name?: string
          type?: 'free' | 'distance' | 'duration' | 'interval'
          target_distance_m?: number | null
          target_duration_s?: number | null
          warmup_duration_s?: number | null
          cooldown_duration_s?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      running_interval_blocks: {
        Row: {
          id: string
          running_session_id: string
          order_index: number
          label: string | null
          phase: 'work' | 'rest'
          duration_s: number
          target_pace_min_km: number | null
          repetitions: number
        }
        Insert: {
          id?: string
          running_session_id: string
          order_index?: number
          label?: string | null
          phase: 'work' | 'rest'
          duration_s: number
          target_pace_min_km?: number | null
          repetitions?: number
        }
        Update: {
          order_index?: number
          label?: string | null
          phase?: 'work' | 'rest'
          duration_s?: number
          target_pace_min_km?: number | null
          repetitions?: number
        }
      }
      running_logs: {
        Row: {
          id: string
          user_id: string
          running_session_id: string | null
          started_at: string
          completed_at: string | null
          distance_m: number | null
          duration_s: number | null
          avg_pace_s_per_km: number | null
          best_pace_s_per_km: number | null
          elevation_gain_m: number | null
          gps_track: Json | null
          overall_feeling: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          running_session_id?: string | null
          started_at?: string
          completed_at?: string | null
          distance_m?: number | null
          duration_s?: number | null
          avg_pace_s_per_km?: number | null
          best_pace_s_per_km?: number | null
          elevation_gain_m?: number | null
          gps_track?: Json | null
          overall_feeling?: number | null
          notes?: string | null
        }
        Update: {
          completed_at?: string | null
          distance_m?: number | null
          duration_s?: number | null
          avg_pace_s_per_km?: number | null
          best_pace_s_per_km?: number | null
          elevation_gain_m?: number | null
          gps_track?: Json | null
          overall_feeling?: number | null
          notes?: string | null
        }
      }
      running_personal_records: {
        Row: {
          id: string
          user_id: string
          distance: '5k' | '10k' | 'semi' | 'marathon'
          duration_s: number
          achieved_at: string
          running_log_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          distance: '5k' | '10k' | 'semi' | 'marathon'
          duration_s: number
          achieved_at: string
          running_log_id?: string | null
        }
        Update: {
          duration_s?: number
          achieved_at?: string
          running_log_id?: string | null
        }
      }
      scheduled_events: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          workout_id: string | null
          running_session_id: string | null
          planned_date: string
          planned_time: string | null
          notification_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          workout_id?: string | null
          running_session_id?: string | null
          planned_date: string
          planned_time?: string | null
          notification_sent?: boolean
        }
        Update: {
          planned_date?: string
          planned_time?: string | null
          notification_sent?: boolean
          running_session_id?: string | null
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription: Json
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription: Json
          user_agent?: string | null
        }
        Update: {
          subscription?: Json
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type aliases
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']

export type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row']

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']

export type SessionExercise = Database['public']['Tables']['session_exercises']['Row']

export type SessionLog = Database['public']['Tables']['session_logs']['Row']
export type SetLog = Database['public']['Tables']['set_logs']['Row']
export type SetLogInsert = Database['public']['Tables']['set_logs']['Insert']

export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']

export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']

export type ScheduledEvent = Database['public']['Tables']['scheduled_events']['Row']

export type RunningSession = Database['public']['Tables']['running_sessions']['Row']
export type RunningSessionInsert = Database['public']['Tables']['running_sessions']['Insert']
export type RunningIntervalBlock = Database['public']['Tables']['running_interval_blocks']['Row']
export type RunningIntervalBlockInsert = Database['public']['Tables']['running_interval_blocks']['Insert']
export type RunningLog = Database['public']['Tables']['running_logs']['Row']
export type RunningPersonalRecord = Database['public']['Tables']['running_personal_records']['Row']
