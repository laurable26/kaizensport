import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, Calendar, Timer, Users, Footprints, MapPin, User } from 'lucide-react'
import { useAppModeStore } from '@/store/appModeStore'

const MUSCULATION_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/exercises', icon: Dumbbell, label: 'Exercices' },
  { to: '/sessions', icon: Timer, label: 'Séances' },
  { to: '/schedule', icon: Calendar, label: 'Planning' },
  { to: '/friends', icon: Users, label: 'Amis' },
]

const RUNNING_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/running', icon: Footprints, label: 'Course' },
  { to: '/running/active', icon: MapPin, label: 'En cours' },
  { to: '/schedule', icon: Calendar, label: 'Planning' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function BottomNav() {
  const mode = useAppModeStore((s) => s.mode)
  const items = mode === 'running' ? RUNNING_NAV : MUSCULATION_NAV

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--color-border)] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-16">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to + label}
            to={to}
            end={to === '/' || to === '/running/active'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors active-scale
              ${isActive
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
