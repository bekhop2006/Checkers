import { useEffect, useState } from 'react'

import { Board } from '../components/Board/Board'
import { puzzles } from '../lib/api'
import { useAuth } from '../features/auth/store'
import type { PuzzleDTO, Square } from '../types'

export function Puzzle() {
  const { user } = useAuth()
  const [p, setP] = useState<PuzzleDTO | null>(null)
  const [result, setResult] = useState<{ correct: boolean; streak: number; solution?: Square[][] } | null>(null)

  useEffect(() => {
    puzzles.daily().then(setP).catch(() => {})
  }, [])

  if (!p) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-muted">
        На сегодня задач не запланировано.
      </div>
    )
  }

  const onMove = async (path: Square[]) => {
    try {
      const r = await puzzles.attempt(p.id, path)
      setResult({ correct: r.correct, streak: r.streak, solution: r.solution ?? undefined })
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 grid sm:grid-cols-[1fr_280px] gap-6">
      <div>
        <Board
          position={p.position}
          legalMoves={p.legal_moves}
          perspective={p.side_to_move}
          onMove={onMove}
          alwaysHint
        />
      </div>
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="text-xs uppercase text-muted">Задача дня</div>
          <div className="font-display text-lg mt-1">{p.description}</div>
          <div className="text-sm text-ink2 mt-2">
            Ход: <b>{p.side_to_move === 0 ? 'белых' : 'чёрных'}</b>. Сложность {p.difficulty}/5.
          </div>
          {user && (
            <div className="mt-3 text-sm">
              Стрик: <b className="text-brand2">{user.puzzle_streak}</b>
            </div>
          )}
        </div>

        {result && (
          <div
            className={`card p-4 text-sm animate-slidein ${
              result.correct ? 'border-good/60 text-good' : 'border-danger/60 text-danger'
            }`}
          >
            {result.correct ? '🎉 Верно!' : '✗ Не совсем. Решение:'}
            {!result.correct && result.solution && (
              <div className="text-muted text-xs mt-1">{JSON.stringify(result.solution)}</div>
            )}
            <div className="text-muted mt-1">Новая задача — завтра.</div>
          </div>
        )}
      </aside>
    </div>
  )
}
