import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from '@/lib/queryClient'

// Layout
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// Auth
import LoginPage from '@/pages/Auth/LoginPage'

// Dashboard
import DashboardPage from '@/pages/Dashboard/DashboardPage'

// Exercises
import ExercisesPage from '@/pages/Exercises/ExercisesPage'
import ExerciseDetailPage from '@/pages/Exercises/ExerciseDetailPage'
import ExerciseFormPage from '@/pages/Exercises/ExerciseFormPage'

// Sessions
import SessionsPage from '@/pages/Sessions/SessionsPage'
import SessionDetailPage from '@/pages/Sessions/SessionDetailPage'
import SessionFormPage from '@/pages/Sessions/SessionFormPage'
import ActiveSessionPage from '@/pages/Sessions/ActiveSessionPage'

// Workouts
import WorkoutsPage from '@/pages/Workouts/WorkoutsPage'
import WorkoutFormPage from '@/pages/Workouts/WorkoutFormPage'
import ActiveWorkoutPage from '@/pages/Workouts/ActiveWorkoutPage'

// Schedule
import SchedulePage from '@/pages/Schedule/SchedulePage'

// History
import HistoryPage from '@/pages/History/HistoryPage'

// Profile
import ProfilePage from '@/pages/Profile/ProfilePage'

// Friends
import FriendsPage from '@/pages/Friends/FriendsPage'

// Privacy
import PrivacyPage from '@/pages/Privacy/PrivacyPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Exercises */}
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/new" element={<ExerciseFormPage />} />
            <Route path="exercises/:id" element={<ExerciseDetailPage />} />
            <Route path="exercises/:id/edit" element={<ExerciseFormPage />} />

            {/* Sessions */}
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/new" element={<SessionFormPage />} />
            <Route path="sessions/active" element={<ActiveSessionPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="sessions/:id/edit" element={<SessionFormPage />} />

            {/* Workouts */}
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="workouts/new" element={<WorkoutFormPage />} />
            <Route path="workouts/:id" element={<WorkoutsPage />} />
            <Route path="workouts/:id/start" element={<ActiveWorkoutPage />} />

            {/* Schedule */}
            <Route path="schedule" element={<SchedulePage />} />

            {/* History */}
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<HistoryPage />} />

            {/* Profile */}
            <Route path="profile" element={<ProfilePage />} />

            {/* Friends */}
            <Route path="friends" element={<FriendsPage />} />

            {/* Privacy */}
            <Route path="privacy" element={<PrivacyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: 'var(--color-success)', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: 'var(--color-danger)', secondary: 'white' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
