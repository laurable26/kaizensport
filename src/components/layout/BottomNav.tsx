import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Timer, Calendar, Users, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/exercises', icon: Dumbbell, label: 'Exercices' },
  { to: '/sessions', icon: Timer, label: 'Séances' },
  { to: '/schedule', icon: Calendar, label: 'Planning' },
  { to: '/friends', icon: Users, label: 'Amis' },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--color-border)] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
