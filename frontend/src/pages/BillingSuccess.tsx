import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { auth } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function BillingSuccess() {
  const { setUser } = useAuth()
  useEffect(() => {
    auth.me().then(setUser).catch(() => {})
  }, [setUser])

  return (
    <div className="max-w-md mx-auto p-10 text-center">
      <div className="text-5xl mb-3">🎉</div>
      <h1 className="font-display text-2xl font-semibold mb-1">Добро пожаловать в Pro!</h1>
      <p className="text-ink2 mb-6">
        Премиум-скины и глубокий ИИ-разбор уже доступны. Если бейдж не появился, обновите страницу
        через минуту — webhook от Stripe мог чуть задержаться.
      </p>
      <Link to="/" className="btn btn-primary">
        Играть
      </Link>
    </div>
  )
}
