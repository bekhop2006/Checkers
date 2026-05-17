import { useEffect, useState } from 'react'

import { leaderboard } from '../lib/api'
import type { LeaderboardEntry } from '../types'

type Scope = 'global' | 'city' | 'weekly'

export function Leaderboard() {
  const [scope, setScope] = useState<Scope>('global')
  const [cities, setCities] = useState<string[]>([])
  const [city, setCity] = useState('Алматы')
  const [rows, setRows] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    leaderboard.cities().then((r) => setCities(r.cities)).catch(() => {})
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        if (scope === 'global') setRows(await leaderboard.global())
        else if (scope === 'weekly') setRows(await leaderboard.weekly())
        else setRows(await leaderboard.city(city))
      } catch {
        setRows([])
      }
    }
    load()
  }, [scope, city])

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl font-display font-bold mb-1">Рейтинг</h1>
      <p className="text-muted text-sm mb-6">
        ELO-таблица. Только ранкеды учитываются при подсчёте.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['global', 'city', 'weekly'] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`btn ${scope === s ? 'btn-primary' : ''}`}
          >
            {s === 'global' ? 'Глобально' : s === 'city' ? 'По городу' : 'Неделя'}
          </button>
        ))}
        {scope === 'city' && (
          <select className="input max-w-[16rem]" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-muted text-xs uppercase">
            <tr>
              <th className="text-left p-3 w-12">#</th>
              <th className="text-left p-3">Игрок</th>
              <th className="text-left p-3 hidden sm:table-cell">Город</th>
              <th className="text-right p-3">Рейтинг</th>
              <th className="text-right p-3 hidden sm:table-cell">Партий</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  Пока пусто. Сыграйте партию — здесь появятся игроки.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-border hover:bg-surface2/50">
                <td className="p-3 font-display">{r.rank}</td>
                <td className="p-3">
                  <span className="font-medium">{r.display_name}</span>
                  {r.is_pro && <span className="pro-badge ml-2">PRO</span>}
                </td>
                <td className="p-3 hidden sm:table-cell text-ink2">{r.city ?? '—'}</td>
                <td className="p-3 text-right font-display tabular-nums">{r.rating}</td>
                <td className="p-3 text-right hidden sm:table-cell text-muted">{r.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
