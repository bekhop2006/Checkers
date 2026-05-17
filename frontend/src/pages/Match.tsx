import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Board } from '../components/Board/Board'
import { ClockPair } from '../components/Clock/Clock'
import { MoveList } from '../components/MoveList/MoveList'
import { games } from '../lib/api'
import { useAuth } from '../features/auth/store'
import { useGameSocket } from '../features/game/useGameSocket'
import type { GameDetail, Square } from '../types'

export function Match() {
  const { gameId } = useParams<{ gameId: string }>()
  const [search] = useSearchParams()
  const invite = search.get('invite')
  const { user } = useAuth()
  const nav = useNavigate()
  const id = gameId ? Number(gameId) : null

  // Strategy: vs-AI games use REST; friend/ranked use WebSocket.
  const [restGame, setRestGame] = useState<GameDetail | null>(null)
  const [useWS, setUseWS] = useState(false)

  useEffect(() => {
    if (!id) return
    games.get(id).then((g) => {
      setRestGame(g)
      setUseWS(g.mode !== 'vs_ai')
    })
  }, [id])

  const ws = useGameSocket(id, useWS)
  const game = useWS ? ws.game : restGame
  const myColor: 0 | 1 | null = useMemo(() => {
    if (!user || !game) return null
    if (game.white_user_id === user.id) return 0
    if (game.black_user_id === user.id) return 1
    if (game.mode === 'vs_ai') {
      // In vs-AI guest mode (no auth) the "player" side is whichever has null user.
      return game.white_user_id == null && game.black_user_id == null
        ? 0
        : game.white_user_id == null
          ? 0
          : 1
    }
    return null
  }, [game, user])

  const submitMove = useCallback(
    async (path: Square[]) => {
      if (!game || !id) return
      try {
        if (useWS) {
          ws.send({ type: 'move', path })
        } else {
          const g = await games.move(id, path)
          setRestGame(g)
        }
      } catch (e) {
        console.warn('move rejected', e)
      }
    },
    [game, id, useWS, ws],
  )

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-muted">Загружаем партию…</div>
    )
  }

  const lastMove = lastMoveOf(game)
  const isMine = myColor !== null && game.position.turn === myColor && game.status === 'active'
  const flip = myColor === 1

  return (
    <div className="max-w-5xl mx-auto p-4 grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {invite && (game.mode === 'friend' || game.mode === 'ranked') && (
          <InviteBanner token={invite} />
        )}
        <Board
          position={game.position}
          legalMoves={isMine ? game.legal_moves : []}
          onMove={submitMove}
          perspective={myColor}
          flip={flip}
          lastMove={lastMove}
          alwaysHint={Boolean(user?.kids_mode)}
        />
        <GameStatus game={game} mine={myColor} />
      </div>

      <aside className="space-y-4">
        <ClockPair
          whiteMs={game.white_ms_left}
          blackMs={game.black_ms_left}
          activeTurn={game.position.turn}
          flip={flip}
        />
        <MoveList moves={game.moves} activePly={null} />

        {game.status === 'active' && useWS && (
          <div className="flex gap-2">
            <button
              className="btn flex-1"
              onClick={() => ws.send({ type: 'draw_offer' })}
              title="Предложить ничью"
            >
              Ничья
            </button>
            <button
              className="btn flex-1"
              onClick={() => {
                if (confirm('Сдаться?')) ws.send({ type: 'resign' })
              }}
            >
              Сдаться
            </button>
          </div>
        )}

        {game.status === 'completed' && (
          <div className="card p-4 text-center">
            <div className="font-display text-xl mb-2">{describeResult(game, myColor)}</div>
            <button className="btn btn-primary w-full mb-2" onClick={() => nav(`/review/${game.id}`)}>
              Разбор партии
            </button>
            <Link to="/" className="text-brand2 text-sm hover:underline">
              Новая партия
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}

function InviteBanner({ token }: { token: string }) {
  const url = `${window.location.origin}/join/${token}`
  const [copied, setCopied] = useState(false)
  return (
    <div className="card p-3 mb-3 flex items-center gap-3">
      <div className="text-sm">
        <div className="text-muted text-xs uppercase">Ссылка для друга</div>
        <code className="text-brand2 break-all">{url}</code>
      </div>
      <button
        className="btn btn-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
    </div>
  )
}

function GameStatus({ game, mine }: { game: GameDetail; mine: 0 | 1 | null }) {
  if (game.status !== 'active') return null
  const isMine = mine !== null && game.position.turn === mine
  return (
    <div className="mt-3 text-center text-sm text-muted">
      {isMine
        ? 'Ваш ход.'
        : game.position.turn === 0
          ? 'Ход белых.'
          : 'Ход чёрных.'}
    </div>
  )
}

function describeResult(game: GameDetail, mine: 0 | 1 | null) {
  if (game.result === 'draw') return 'Ничья'
  const winner = game.result === 'white' ? 0 : 1
  if (mine === null) return winner === 0 ? 'Победа белых' : 'Победа чёрных'
  return winner === mine ? 'Победа!' : 'Поражение'
}

function lastMoveOf(g: GameDetail): { from: Square; to: Square } | null {
  if (g.moves.length === 0) return null
  const m = g.moves[g.moves.length - 1]
  if (!m.path || m.path.length < 2) return null
  return { from: m.path[0], to: m.path[m.path.length - 1] }
}
