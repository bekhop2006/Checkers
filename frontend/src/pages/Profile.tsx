import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { games } from '../lib/api'
import { useAuth } from '../features/auth/store'
import type { GameDetail } from '../types'

export function Profile() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [history, setHistory] = useState<GameDetail[]>([])

  useEffect(() => {
    if (!user) return
    games.history(20).then(setHistory).catch(() => {})
  }, [user])

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-ink2 mb-4">Войдите, чтобы посмотреть профиль.</p>
        <button className="btn btn-primary" onClick={() => nav('/login')}>
          Войти
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <div className="card p-6 flex flex-wrap items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand2" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{user.display_name}</h1>
            {user.is_pro && <span className="pro-badge">PRO</span>}
          </div>
          <div className="text-muted text-sm">
            {user.city ?? 'Город не указан'} · {user.email}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center w-full sm:w-auto">
          <Stat label="ELO" value={user.rating} />
          <Stat label="Партий" value={user.games_played} />
          <Stat label="Побед" value={user.wins} />
        </div>
      </div>

      <h2 className="font-display text-xl mt-8 mb-3">Последние партии</h2>
      <div className="card overflow-hidden">
        {history.length === 0 ? (
          <div className="p-6 text-center text-muted">
            История пуста.{' '}
            <Link to="/" className="text-brand2 hover:underline">
              Сыграйте первую партию
            </Link>
            .
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">Режим</th>
                <th className="text-left p-3">Результат</th>
                <th className="text-left p-3">Когда</th>
                <th className="text-right p-3">—</th>
              </tr>
            </thead>
            <tbody>
              {history.map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-surface2/50">
                  <td className="p-3">{labelMode(g.mode)}</td>
                  <td className="p-3">{resultLabel(g, user.id)}</td>
                  <td className="p-3 text-muted">{new Date(g.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <Link to={`/review/${g.id}`} className="text-brand2 hover:underline">
                      Разбор
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase text-muted">{label}</div>
    </div>
  )
}

function labelMode(m: string) {
  return { vs_ai: 'Против ИИ', friend: 'С другом', ranked: 'Рейтинговая' }[m] ?? m
}

function resultLabel(g: GameDetail, userId: number) {
  if (g.status !== 'completed') return 'В процессе'
  if (g.result === 'draw') return 'Ничья'
  if (g.result === 'white' && g.white_user_id === userId) return 'Победа'
  if (g.result === 'black' && g.black_user_id === userId) return 'Победа'
  if (g.result === 'white' || g.result === 'black') return 'Поражение'
  return '—'
}
