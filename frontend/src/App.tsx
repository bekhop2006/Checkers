import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Match } from './pages/Match'
import { Review } from './pages/Review'
import { Leaderboard } from './pages/Leaderboard'
import { Pricing } from './pages/Pricing'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Puzzle } from './pages/Puzzle'
import { Join } from './pages/Join'
import { BillingSuccess } from './pages/BillingSuccess'
import { useAuth } from './features/auth/store'

export function App() {
  const { bootstrap, user, initialized } = useAuth()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme)
    }
    document.documentElement.setAttribute('data-board-skin', user?.board_skin || 'classic')
    document.documentElement.setAttribute('data-piece-skin', user?.piece_skin || 'classic')
    if (user?.locale) {
      document.documentElement.setAttribute('lang', user.locale)
    }
  }, [user?.theme, user?.locale, user?.board_skin, user?.piece_skin])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Загружаем…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/play/:gameId" element={<Match />} />
          <Route path="/join/:token" element={<Join />} />
          <Route path="/review/:gameId" element={<Review />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/puzzle" element={<Puzzle />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Checkers · Beknur Tanibergeb · nFactorial 26
      </footer>
    </div>
  )
}
