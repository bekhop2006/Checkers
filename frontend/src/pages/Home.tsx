import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, games } from '../lib/api'
import { useAuth } from '../features/auth/store'

type Diff = 'easy' | 'medium' | 'hard' | 'expert'
type TC = { label: string; sec: number; inc: number }

const tcs: TC[] = [
  { label: '1+0 (Bullet)', sec: 60, inc: 0 },
  { label: '3+2 (Blitz)', sec: 180, inc: 2 },
  { label: '5+0 (Blitz)', sec: 300, inc: 0 },
  { label: '10+0 (Rapid)', sec: 600, inc: 0 },
]

export function Home() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [diff, setDiff] = useState<Diff>('medium')
  const [tc, setTc] = useState<TC>(tcs[2])
  const [side, setSide] = useState<'white' | 'black' | 'random'>('white')
  const [err, setErr] = useState<string | null>(null)

  const startVsAi = async () => {
    setBusy(true)
    setErr(null)
    try {
      const g = await games.createVsAi({
        difficulty: diff,
        player_color: side,
        time_control: { initial_seconds: tc.sec, increment_seconds: tc.inc },
      })
      nav(`/play/${g.id}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const startFriend = async () => {
    if (!user) {
      nav('/signup?next=/')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const g = await games.createFriend({
        time_control: { initial_seconds: tc.sec, increment_seconds: tc.inc },
      })
      nav(`/play/${g.id}?invite=${g.friend_token}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const startRanked = async () => {
    if (!user) {
      nav('/signup?next=/')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const g = await games.createRanked({
        time_control: { initial_seconds: tc.sec, increment_seconds: tc.inc },
      })
      nav(`/play/${g.id}?invite=${g.friend_token}`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight">
          Шашки нового поколения.
        </h1>
        <p className="text-ink2 text-lg mt-3 max-w-2xl">
          Блиц-дуэли, ИИ-тренер, рейтинг по городам, режим для детей и Pro-подписка —
          всё, что должно быть у современной игровой платформы.
        </p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick start card */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold mb-3">Сыграть прямо сейчас</h2>

          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase text-muted mb-1.5">Контроль времени</div>
              <div className="flex flex-wrap gap-2">
                {tcs.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setTc(t)}
                    className={`btn ${tc.label === t.label ? 'btn-primary' : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted mb-1.5">Сложность ИИ</div>
              <div className="flex flex-wrap gap-2">
                {(['easy', 'medium', 'hard', 'expert'] as Diff[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiff(d)}
                    className={`btn ${diff === d ? 'btn-primary' : ''} ${
                      d === 'expert' && !user?.is_pro ? 'opacity-60' : ''
                    }`}
                    disabled={d === 'expert' && !user?.is_pro}
                    title={d === 'expert' && !user?.is_pro ? 'Доступно с Pro' : ''}
                  >
                    {labelDiff(d)}
                    {d === 'expert' && <span className="ml-1 chip text-xs">PRO</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted mb-1.5">Я играю</div>
              <div className="flex gap-2">
                {(['white', 'black', 'random'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`btn ${side === s ? 'btn-primary' : ''}`}
                  >
                    {s === 'white' ? 'Белыми' : s === 'black' ? 'Чёрными' : 'Случайно'}
                  </button>
                ))}
              </div>
            </div>

            {err && <div className="text-danger text-sm">{err}</div>}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                className="btn btn-primary px-6 py-3 text-base"
                onClick={startVsAi}
                disabled={busy}
              >
                Играть с ИИ
              </button>
              <button className="btn px-6 py-3 text-base" onClick={startFriend} disabled={busy}>
                Создать комнату с другом
              </button>
              <button className="btn px-6 py-3 text-base" onClick={startRanked} disabled={busy}>
                Рейтинговая дуэль
              </button>
            </div>
          </div>
        </section>

        {/* Modes side panel */}
        <section className="space-y-3">
          <div className="card p-5">
            <div className="text-xs text-muted uppercase">Тренажёр</div>
            <h3 className="font-display font-semibold mt-1 text-lg">Задача дня</h3>
            <p className="text-ink2 text-sm mt-1">
              Ежедневная тактическая позиция. Сохраняй стрик и продвигайся по таблице тренажёра.
            </p>
            <a className="btn btn-primary w-full mt-3" href="/puzzle">
              Решить
            </a>
          </div>

          <div className="card p-5">
            <div className="text-xs text-muted uppercase">Социальное</div>
            <h3 className="font-display font-semibold mt-1 text-lg">Рейтинг по городам</h3>
            <p className="text-ink2 text-sm mt-1">
              Соревнуйся с игроками из Алматы, Астаны и Шымкента. Победы поднимают тебя в локальном
              ELO.
            </p>
            <a className="btn w-full mt-3" href="/leaderboard">
              Открыть таблицу
            </a>
          </div>

          <div className="card p-5">
            <div className="text-xs text-muted uppercase">Подписка</div>
            <h3 className="font-display font-semibold mt-1 text-lg flex items-center gap-2">
              Pro <span className="pro-badge">PRO</span>
            </h3>
            <p className="text-ink2 text-sm mt-1">
              Премиум-скины, ИИ-тренер с глубоким разбором, эксперт-уровень ИИ.
            </p>
            <a className="btn w-full mt-3" href="/pricing">
              Подробнее
            </a>
          </div>
        </section>
      </div>

      <section className="mt-10 card p-6">
        <div className="grid sm:grid-cols-3 gap-6 text-sm">
          <Feature title="Реальный мультиплеер" desc="WebSocket-комнаты по ссылке, синхронизация состояния через сервер, переподключение без потери позиции." />
          <Feature title="AI Coach с человеческим языком" desc="Свой движок находит блёндеры, Claude объясняет 2-3 предложениями, в режиме «для детей» — простыми словами." />
          <Feature title="Адаптировано под мобильник" desc="Сенсорный ввод, авто-масштаб доски, быстрые блиц-партии в кармане." />
        </div>
      </section>
    </div>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <div className="text-brand2 font-display font-semibold">{title}</div>
      <div className="text-ink2 mt-1">{desc}</div>
    </div>
  )
}

function labelDiff(d: Diff) {
  return { easy: 'Лёгкий', medium: 'Средний', hard: 'Сильный', expert: 'Эксперт' }[d]
}
