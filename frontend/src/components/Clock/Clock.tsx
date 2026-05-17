import clsx from 'clsx'
import { formatMs } from '../../lib/board'

interface Props {
  whiteMs: number
  blackMs: number
  activeTurn: 0 | 1
  flip?: boolean
}

export function ClockPair({ whiteMs, blackMs, activeTurn, flip }: Props) {
  const top = flip ? 'white' : 'black'
  const blocks =
    top === 'black'
      ? [
          { label: 'Чёрные', ms: blackMs, active: activeTurn === 1 },
          { label: 'Белые', ms: whiteMs, active: activeTurn === 0 },
        ]
      : [
          { label: 'Белые', ms: whiteMs, active: activeTurn === 0 },
          { label: 'Чёрные', ms: blackMs, active: activeTurn === 1 },
        ]
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={clsx(
            'card px-4 py-3 font-display tracking-wide',
            b.active && 'ring-2 ring-brand/60 shadow-glow',
            b.ms <= 10_000 && b.active && 'text-danger animate-pulse',
          )}
        >
          <div className="text-[10px] uppercase text-muted mb-0.5">{b.label}</div>
          <div className="text-2xl font-semibold tabular-nums">{formatMs(b.ms)}</div>
        </div>
      ))}
    </div>
  )
}
