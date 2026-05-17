import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, billing } from '../lib/api'
import type { BillingConfig } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function Pricing() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [cfg, setCfg] = useState<BillingConfig | null>(null)
  const [busy, setBusy] = useState<'monthly' | 'yearly' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    billing.config().then(setCfg).catch(() => {})
  }, [])

  const upgrade = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      nav('/signup?next=/pricing')
      return
    }
    if (user.kids_mode) {
      setErr('Оплата отключена в детском режиме. Отключите kids mode в настройках.')
      return
    }
    setBusy(plan)
    setErr(null)
    try {
      const { url } = await billing.checkout(plan)
      window.location.href = url
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Не удалось открыть оплату')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
        Checkers <span className="pro-badge align-middle text-base">PRO</span>
      </h1>
      <p className="text-ink2 text-lg mb-8">
        Премиум-скины, глубокий разбор партии и доступ к ИИ-эксперту.
      </p>
      {user?.kids_mode && (
        <div className="card p-4 mb-4 text-sm text-warn border-warn/50">
          В детском режиме покупки и управление подпиской недоступны.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <PlanCard
          title="Месячная"
          price={user?.is_pro ? 'Активна' : '$3.99 / мес'}
          perks={['Эксперт-сложность ИИ', 'Глубокий AI Coach без лимитов', 'Премиум-скины', 'Отмена в любой момент']}
          cta={user?.is_pro ? 'Управлять' : 'Оформить'}
          onClick={() => (user?.is_pro ? billing.portal().then(({ url }) => (window.location.href = url)) : upgrade('monthly'))}
          busy={busy === 'monthly'}
          disabled={Boolean(user?.kids_mode)}
        />
        <PlanCard
          title="Годовая (-30%)"
          price={user?.is_pro ? 'Активна' : '$29.99 / год'}
          highlight
          perks={['Всё из месячной', 'Экономия 30%', 'Бейдж "Founding member"']}
          cta={user?.is_pro ? 'Управлять' : 'Оформить'}
          onClick={() => (user?.is_pro ? billing.portal().then(({ url }) => (window.location.href = url)) : upgrade('yearly'))}
          busy={busy === 'yearly'}
          disabled={Boolean(user?.kids_mode)}
        />
      </div>

      {err && <div className="text-danger text-sm mt-4">{err}</div>}

      {!cfg?.configured && (
        <div className="mt-6 text-xs text-muted text-center">
          Сейчас активен тестовый режим Stripe. Используйте карту <code className="text-brand2">4242 4242 4242 4242</code>, любую дату и любой CVC.
        </div>
      )}

      <section className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
        <Trio title="Глубокий AI Coach" desc="Claude формулирует разбор каждого критического хода понятным языком." />
        <Trio title="Эксперт-движок" desc="Глубокий поиск с прокачанным эвалом для тренировки против сильного соперника." />
        <Trio title="Скины" desc="Эксклюзивные доски и фигуры — Marble, Gold, Blitz и тематические темы."/>
      </section>
    </div>
  )
}

function PlanCard({
  title,
  price,
  perks,
  cta,
  onClick,
  busy,
  highlight,
  disabled,
}: {
  title: string
  price: string
  perks: string[]
  cta: string
  onClick: () => void
  busy?: boolean
  highlight?: boolean
  disabled?: boolean
}) {
  return (
    <div className={`card p-6 ${highlight ? 'shadow-glow ring-1 ring-brand/40' : ''}`}>
      <div className="flex justify-between items-baseline">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <div className="font-display text-2xl">{price}</div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-ink2">
        {perks.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-brand2">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        className={`btn ${highlight ? 'btn-primary' : ''} w-full mt-5`}
        onClick={onClick}
        disabled={busy || disabled}
      >
        {disabled ? 'Недоступно в kids mode' : busy ? 'Минутку…' : cta}
      </button>
    </div>
  )
}

function Trio({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card p-4">
      <div className="font-display text-brand2 font-semibold">{title}</div>
      <div className="text-ink2 mt-1">{desc}</div>
    </div>
  )
}
