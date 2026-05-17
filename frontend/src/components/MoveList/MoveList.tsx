import clsx from 'clsx'

import type { MoveDTO } from '../../types'

interface Props {
  moves: MoveDTO[]
  activePly?: number | null
  onJump?: (ply: number) => void
}

const CLASS_COLOR: Record<string, string> = {
  blunder: 'text-danger',
  mistake: 'text-warn',
  inaccuracy: 'text-warn/80',
  good: 'text-good',
  excellent: 'text-good',
  brilliant: 'text-brand2',
}

const CLASS_SYMBOL: Record<string, string> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
  good: '·',
  excellent: '!',
  brilliant: '!!',
}

export function MoveList({ moves, activePly, onJump }: Props) {
  const rows: MoveDTO[][] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push([moves[i], moves[i + 1]].filter(Boolean))
  }
  return (
    <div className="card p-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
      <div className="text-xs uppercase text-muted mb-2 px-1">Ходы</div>
      <ol className="text-sm">
        {rows.length === 0 && <li className="text-muted px-1">Ходов пока нет.</li>}
        {rows.map((pair, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1 px-1 py-0.5">
            <span className="text-muted tabular-nums">{i + 1}.</span>
            {pair.map((m) => (
              <button
                key={m.ply}
                onClick={() => onJump?.(m.ply)}
                className={clsx(
                  'text-left rounded px-1.5 py-0.5 hover:bg-surface2',
                  activePly === m.ply && 'bg-surface2',
                  m.classification && CLASS_COLOR[m.classification],
                )}
              >
                {m.notation}
                {m.classification && (
                  <sup className="ml-0.5 text-xs">{CLASS_SYMBOL[m.classification] ?? ''}</sup>
                )}
              </button>
            ))}
            {pair.length === 1 && <span />}
          </li>
        ))}
      </ol>
    </div>
  )
}
