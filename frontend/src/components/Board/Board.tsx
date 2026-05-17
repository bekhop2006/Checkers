import { useMemo, useState } from 'react'
import clsx from 'clsx'

import {
  PIECE_W_MAN,
  PIECE_W_KING,
  PIECE_B_MAN,
  PIECE_B_KING,
  colorOf,
  continuations,
  indexLegalMoves,
  isDark,
  isKing,
  sqEq,
} from '../../lib/board'
import type { BoardPosition, LegalMove, Square } from '../../types'

interface Props {
  position: BoardPosition
  legalMoves: LegalMove[]
  /** Submit a complete move. The path is the full sequence of clicked squares. */
  onMove?: (path: Square[]) => void
  /** "user" color: only this side's pieces can be clicked. null = read-only. */
  perspective?: 0 | 1 | null
  /** Reverse the board so this color is at the bottom. */
  flip?: boolean
  /** Highlight the last move (e.g. for review). */
  lastMove?: { from: Square; to: Square } | null
  /** Always show hints, even when no piece is selected (kids mode). */
  alwaysHint?: boolean
}

export function Board({
  position,
  legalMoves,
  onMove,
  perspective = 0,
  flip = false,
  lastMove,
  alwaysHint = false,
}: Props) {
  const [path, setPath] = useState<Square[]>([])

  const { bySource, sources } = useMemo(() => indexLegalMoves(legalMoves), [legalMoves])

  const selected: Square | null = path.length > 0 ? path[path.length - 1] : null
  const candidatesFromSelected = useMemo(() => {
    if (path.length === 0) return { nextSquares: [] as Square[], complete: null as LegalMove | null }
    const movesFromSource = bySource.get(`${path[0][0]},${path[0][1]}`) ?? []
    return continuations(movesFromSource, path)
  }, [path, bySource])

  const reverseRow = (r: number) => (flip ? 7 - r : r)
  const reverseCol = (c: number) => (flip ? 7 - c : c)
  const isMyTurn = perspective !== null && position.turn === perspective

  const onSquareClick = (r: number, c: number) => {
    if (!onMove || !isMyTurn) return
    const here: Square = [r, c]
    const cell = position.cells[r][c]

    // If clicking a candidate next square, extend the path.
    if (path.length > 0) {
      if (candidatesFromSelected.nextSquares.some((s) => sqEq(s, here))) {
        const newPath = [...path, here]
        // If this completes a legal full move, fire it.
        const sourceKey = `${path[0][0]},${path[0][1]}`
        const movesFromSource = bySource.get(sourceKey) ?? []
        const cont = continuations(movesFromSource, newPath)
        if (cont.complete && cont.nextSquares.length === 0) {
          onMove(newPath)
          setPath([])
          return
        }
        // Auto-fire if it's already a unique completion (mandatory continuation).
        if (cont.complete && cont.nextSquares.length === 0) {
          onMove(newPath)
          setPath([])
        } else {
          setPath(newPath)
        }
        return
      }
      // Clicked elsewhere — re-select.
      setPath([])
    }

    // No path yet: pick a source.
    if (colorOf(cell) === perspective && sources.has(`${r},${c}`)) {
      setPath([here])
    } else {
      setPath([])
    }
  }

  const targetSquares = useMemo(() => {
    if (path.length === 0) {
      if (!alwaysHint) return new Set<string>()
      // In always-hint mode we don't pre-fill (the user still picks a source).
      return new Set<string>()
    }
    return new Set(candidatesFromSelected.nextSquares.map(([r, c]) => `${r},${c}`))
  }, [path, candidatesFromSelected, alwaysHint])

  const lastFromKey = lastMove ? `${lastMove.from[0]},${lastMove.from[1]}` : ''
  const lastToKey = lastMove ? `${lastMove.to[0]},${lastMove.to[1]}` : ''

  return (
    <div className="board">
      {Array.from({ length: 8 }).map((_, rrIdx) => {
        const r = reverseRow(rrIdx)
        return Array.from({ length: 8 }).map((_, ccIdx) => {
          const c = reverseCol(ccIdx)
          const dark = isDark(r, c)
          const piece = position.cells[r][c]
          const isSel = selected && sqEq(selected, [r, c])
          const isLegalTarget = targetSquares.has(`${r},${c}`)
          const isCaptureTarget =
            isLegalTarget &&
            candidatesFromSelected.nextSquares.some((sq) => sqEq(sq, [r, c])) &&
            // Heuristic: if the diagonal distance is > 1 it's a capture.
            (path.length > 0 && Math.abs(r - path[path.length - 1][0]) > 1)
          const isSourceHint =
            alwaysHint && path.length === 0 && sources.has(`${r},${c}`) && colorOf(piece) === perspective
          const isLastFrom = `${r},${c}` === lastFromKey
          const isLastTo = `${r},${c}` === lastToKey

          return (
            <div
              key={`${r}-${c}`}
              className={clsx(
                'square',
                dark ? 'dark' : 'light',
                isSel && 'from',
                isLegalTarget && 'legal',
                isCaptureTarget && 'capture-target',
                isSourceHint && 'legal',
                (isLastFrom || isLastTo) && 'last-move',
              )}
              onClick={() => onSquareClick(r, c)}
              data-sq={`${r},${c}`}
            >
              {piece !== 0 && (
                <div
                  className={clsx(
                    'piece',
                    (piece === PIECE_W_MAN || piece === PIECE_W_KING) && 'white',
                    (piece === PIECE_B_MAN || piece === PIECE_B_KING) && 'black',
                    isKing(piece) && 'king',
                    isSel && 'selected',
                    !isMyTurn && 'disabled',
                  )}
                />
              )}
              {/* coordinate annotations on the bottom row and left column */}
              {ccIdx === 0 && (
                <span className="absolute top-0.5 left-1 text-[10px] opacity-60 pointer-events-none">
                  {8 - r}
                </span>
              )}
              {rrIdx === 7 && (
                <span className="absolute bottom-0.5 right-1 text-[10px] opacity-60 pointer-events-none">
                  {String.fromCharCode(97 + c)}
                </span>
              )}
            </div>
          )
        })
      })}
    </div>
  )
}
