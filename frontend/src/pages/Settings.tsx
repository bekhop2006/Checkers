import { useEffect, useState } from 'react'

import { ApiError, auth, billing } from '../lib/api'
import type { BillingConfig } from '../lib/api'
import { useAuth } from '../features/auth/store'

export function Settings() {
  const { user, setUser } = useAuth()
  const [cfg, setCfg] = useState<BillingConfig | null>(null)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState<string | null>(null)

  useEffect(() => {
    billing.config().then(setCfg).catch(() => {})
  }, [])

  if (!user) return <div className="p-6 text-muted">Войдите, чтобы поменять настройки.</div>

  const update = async (patch: any) => {
    try {
      const u = await auth.updateMe(patch)
      setUser(u)
    } catch (e) {
      console.warn(e)
    }
  }

  const toggleKids = async () => {
    setPinErr(null)
    if (pin.length < 4) {
      setPinErr('PIN: минимум 4 цифры.')
      return
    }
    try {
      const u = await auth.kidsMode(!user.kids_mode, pin)
      setUser(u)
      setPin('')
    } catch (e) {
      setPinErr(e instanceof ApiError ? e.message : 'PIN не подошёл')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-4">
      <h1 className="text-2xl font-display font-bold mb-2">Настройки</h1>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-2">Тема</h2>
        <div className="flex gap-2">
          {['dark', 'light'].map((t) => (
            <button
              key={t}
              onClick={() => {
                document.documentElement.setAttribute('data-theme', t)
                update({ theme: t })
              }}
              className={`btn ${user.theme === t ? 'btn-primary' : ''}`}
            >
              {t === 'dark' ? 'Тёмная' : 'Светлая'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-2">Скины фигур</h2>
        <div className="flex flex-wrap gap-2">
          {cfg &&
            Object.entries(cfg.skins.pieces).map(([id, info]) => {
              const locked = info.pro && !user.is_pro
              return (
                <button
                  key={id}
                  className={`btn ${user.piece_skin === id ? 'btn-primary' : ''} ${locked ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (locked) return
                    document.documentElement.setAttribute('data-piece-skin', id)
                    update({ piece_skin: id })
                  }}
                  disabled={locked}
                >
                  {info.label}
                  {info.pro && <span className="pro-badge ml-2">PRO</span>}
                </button>
              )
            })}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-2">Доски</h2>
        <div className="flex flex-wrap gap-2">
          {cfg &&
            Object.entries(cfg.skins.boards).map(([id, info]) => {
              const locked = info.pro && !user.is_pro
              return (
                <button
                  key={id}
                  className={`btn ${user.board_skin === id ? 'btn-primary' : ''} ${locked ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (locked) return
                    document.documentElement.setAttribute('data-board-skin', id)
                    update({ board_skin: id })
                  }}
                  disabled={locked}
                >
                  {info.label}
                  {info.pro && <span className="pro-badge ml-2">PRO</span>}
                </button>
              )
            })}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-2">Детский режим</h2>
        <p className="text-sm text-ink2 mb-3">
          Большие фигуры, подсказки всегда включены, AI Coach — простым языком, нет чата и оплаты.
          Включение/выключение защищено PIN-кодом.
        </p>
        <div className="flex gap-2 items-center">
          <input
            className="input max-w-[140px]"
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
          <button
            className={`btn ${user.kids_mode ? 'btn-primary' : ''}`}
            onClick={toggleKids}
          >
            {user.kids_mode ? 'Выключить' : 'Включить'}
          </button>
          {user.kids_mode && <span className="chip bg-good/15 text-good">Активен</span>}
        </div>
        {pinErr && <div className="text-danger text-sm mt-2">{pinErr}</div>}
      </div>
    </div>
  )
}
