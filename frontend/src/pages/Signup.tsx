import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError, auth, leaderboard } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function Signup() {
  const { setUser } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('Алматы')
  const [cities, setCities] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    leaderboard.cities().then((r) => setCities(r.cities)).catch(() => setCities([]))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await auth.signup({
        email,
        password,
        display_name: displayName,
        city: city === 'Other' ? undefined : city,
      })
      setUser(u)
      nav('/')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось создать аккаунт')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-display font-bold mb-1">Регистрация</h1>
      <p className="text-muted text-sm mb-6">
        Выберите город — попадёте в локальный рейтинг и сможете соревноваться со своими.
      </p>
      <form onSubmit={submit} className="card p-5 space-y-3">
        <label className="block">
          <div className="text-xs text-muted mb-1">Имя в профиле</div>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            required
          />
        </label>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <label className="block">
          <div className="text-xs text-muted mb-1">Город</div>
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="text-danger text-sm">{error}</div>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Создаём…' : 'Создать аккаунт'}
        </button>
        <div className="text-sm text-muted text-center">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-brand2 hover:underline">
            Войти
          </Link>
        </div>
      </form>
    </div>
  )
}
