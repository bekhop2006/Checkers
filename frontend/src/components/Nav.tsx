import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'

import { useAuth } from '../features/auth/store'

const tabs = [
  { to: '/', label: 'Главная' },
  { to: '/puzzle', label: 'Тренажёр' },
  { to: '/leaderboard', label: 'Рейтинг' },
  { to: '/pricing', label: 'Pro' },
]

export function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    const next = cur === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
        <NavLink to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand2 shadow-glow" />
          Checkers
        </NavLink>
        <nav className="hidden sm:flex items-center gap-1 ml-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => clsx('nav-link', isActive && 'active')}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <button className="btn-ghost btn" onClick={toggleTheme} title="Тема">
          ◐
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <NavLink to="/profile" className="chip">
              {user.display_name}
              <span className="text-muted">· {user.rating}</span>
              {user.is_pro && <span className="pro-badge ml-1">PRO</span>}
            </NavLink>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await logout()
                navigate('/')
              }}
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink to="/login" className="btn btn-ghost">
              Войти
            </NavLink>
            <NavLink to="/signup" className="btn btn-primary">
              Регистрация
            </NavLink>
          </div>
        )}
      </div>
    </header>
  )
}
