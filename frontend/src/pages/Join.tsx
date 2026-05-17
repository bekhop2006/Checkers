import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError, auth, games } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function Join() {
  const { token } = useParams<{ token: string }>()
  const { setUser } = useAuth()
  const nav = useNavigate()
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    games
      .join(token)
      .then(async (g) => {
        try {
          const me = await auth.me()
          setUser(me)
        } catch {
          /* ignore */
        }
        nav(`/play/${g.id}`)
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'Не удалось присоединиться'))
  }, [token, nav, setUser])

  return (
    <div className="max-w-md mx-auto p-8 text-center text-ink2">
      {err ? <div className="text-danger">{err}</div> : 'Подключаемся к игре…'}
    </div>
  )
}
