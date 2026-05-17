import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Board } from '../components/Board/Board'
import { MoveList } from '../components/MoveList/MoveList'
import { games } from '../lib/api'
import type { BoardPosition, GameDetail } from '../types'

// Replay state by applying the persisted move paths sequentially.
// We rely on the wire move.path data; for each path we update cells.

function applyPath(pos: BoardPosition, path: number[][], captured: number[][], promoted: boolean): BoardPosition {
  const cells = pos.cells.map((row) => [...row])
  const [fr, fc] = path[0]
  const piece = cells[fr][fc]
  cells[fr][fc] = 0
  for (const [r, c] of captured) cells[r][c] = 0
  const [tr, tc] = path[path.length - 1]
  let final = piece
  // mid-chain or end promotion: 1=wM->2, 3=bM->4
  if (promoted || (piece === 1 && tr === 0) || (piece === 3 && tr === 7)) {
    if (piece === 1) final = 2
    if (piece === 3) final = 4
  }
  cells[tr][tc] = final
  return { ...pos, cells, turn: (1 - pos.turn) as 0 | 1 }
}

const INITIAL_POS: BoardPosition = {
  cells: Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      if ((r + c) % 2 !== 1) return 0
      if (r < 3) return 3 // black man
      if (r > 4) return 1 // white man
      return 0
    }),
  ),
  turn: 0,
  pliesSinceProgress: 0,
}

export function Review() {
  const { gameId } = useParams<{ gameId: string }>()
  const nav = useNavigate()
  const [game, setGame] = useState<GameDetail | null>(null)
  const [activePly, setActivePly] = useState<number | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (!gameId) return
    const id = Number(gameId)
    games.get(id).then(setGame)
    // Kick analysis (idempotent on the backend).
    games.analyze(id).then(setGame).catch(() => {})
  }, [gameId])

  // Re-poll while running coach analysis.
  useEffect(() => {
    if (!game || game.coach_status !== 'running') return
    setAnalyzing(true)
    const t = window.setInterval(async () => {
      const g = await games.get(game.id)
      setGame(g)
      if (g.coach_status === 'ready' || g.coach_status === 'failed') {
        setAnalyzing(false)
        window.clearInterval(t)
      }
    }, 1500)
    return () => window.clearInterval(t)
  }, [game?.id, game?.coach_status])

  const positions = useMemo(() => {
    if (!game) return []
    const out: BoardPosition[] = [INITIAL_POS]
    let cur = INITIAL_POS
    for (const m of game.moves) {
      cur = applyPath(cur, m.path, m.captured, m.promoted)
      out.push(cur)
    }
    return out
  }, [game])

  if (!game) return <div className="max-w-5xl mx-auto p-6 text-muted">Загружаем…</div>

  const idx = activePly === null ? positions.length - 1 : activePly + 1
  const pos = positions[Math.max(0, Math.min(positions.length - 1, idx))]
  const m = activePly !== null ? game.moves[activePly] : game.moves[game.moves.length - 1]
  const lastMove = m
    ? { from: m.path[0] as [number, number], to: m.path[m.path.length - 1] as [number, number] }
    : null

  return (
    <div className="max-w-6xl mx-auto p-4 grid lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <Board position={pos} legalMoves={[]} perspective={null} lastMove={lastMove} />
        <div className="flex justify-center gap-2 mt-3">
          <button
            className="btn"
            onClick={() => setActivePly(null)}
            title="К началу"
          >
            «
          </button>
          <button
            className="btn"
            onClick={() =>
              setActivePly((p) => (p === null ? -1 : Math.max(-1, p - 1)) as any)
            }
          >
            ‹
          </button>
          <button
            className="btn"
            onClick={() =>
              setActivePly((p) =>
                p === null
                  ? game.moves.length - 1
                  : Math.min(game.moves.length - 1, p + 1),
              )
            }
          >
            ›
          </button>
          <button
            className="btn"
            onClick={() => setActivePly(game.moves.length - 1)}
          >
            »
          </button>
        </div>
      </div>

      <aside className="space-y-3">
        <CoachStatus
          status={game.coach_status}
          analyzing={analyzing}
          counts={game.coach_data?.counts}
        />
        <MoveList moves={game.moves} activePly={activePly} onJump={setActivePly} />
        {m?.narrative && (
          <div className="card p-4 animate-slidein">
            <div className="text-xs uppercase text-muted mb-1">AI Coach</div>
            <div className="text-sm leading-relaxed text-ink">{m.narrative}</div>
            {m.best_line && m.best_line.length > 0 && (
              <div className="text-xs text-muted mt-2">
                Лучшие линии: <span className="text-brand2">{m.best_line.join(', ')}</span>
              </div>
            )}
          </div>
        )}
        <button className="btn w-full" onClick={() => nav('/')}>
          В меню
        </button>
      </aside>
    </div>
  )
}

function CoachStatus({
  status,
  analyzing,
  counts,
}: {
  status: GameDetail['coach_status']
  analyzing: boolean
  counts?: any
}) {
  if (status === 'ready' && counts) {
    return (
      <div className="card p-4">
        <div className="text-xs uppercase text-muted mb-2">Разбор готов</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ColorSummary label="Белые" counts={counts.white} />
          <ColorSummary label="Чёрные" counts={counts.black} />
        </div>
      </div>
    )
  }
  if (status === 'running' || analyzing) {
    return (
      <div className="card p-4 text-sm flex items-center gap-2">
        <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
        <span>ИИ анализирует партию…</span>
      </div>
    )
  }
  if (status === 'failed')
    return <div className="card p-4 text-danger text-sm">Не удалось получить разбор.</div>
  return null
}

function ColorSummary({ label, counts }: { label: string; counts: Record<string, number> }) {
  const get = (k: string) => counts?.[k] ?? 0
  return (
    <div>
      <div className="text-ink2 font-medium">{label}</div>
      <ul className="text-xs text-muted mt-1 space-y-0.5">
        <li>Блёндеры: <b className="text-danger">{get('blunder')}</b></li>
        <li>Ошибки: <b className="text-warn">{get('mistake')}</b></li>
        <li>Неточности: <b>{get('inaccuracy')}</b></li>
        <li>Сильные ходы: <b className="text-good">{get('excellent') + get('brilliant')}</b></li>
      </ul>
    </div>
  )
}
