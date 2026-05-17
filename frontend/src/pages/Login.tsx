import { FormEvent, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'

import { ApiError, auth } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function Login() {
  const { setUser } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const next = new URLSearchParams(loc.search).get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await auth.login(email, password)
      setUser(u)
      nav(next)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-display font-bold mb-1">Вход</h1>
      <p className="text-muted text-sm mb-6">Сыграйте партию с друзьями или прокачайте рейтинг.</p>
      <form onSubmit={submit} className="card p-5 space-y-3">
        <label className="block">
          <div className="text-xs text-muted mb-1">Email</div>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <div className="text-xs text-muted mb-1">Пароль</div>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="text-danger text-sm">{error}</div>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Минутку…' : 'Войти'}
        </button>
        <div className="text-sm text-muted text-center">
          Нет аккаунта?{' '}
          <Link to="/signup" className="text-brand2 hover:underline">
            Зарегистрироваться
          </Link>
        </div>
      </form>
    </div>
  )
}
