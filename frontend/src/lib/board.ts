/** Tiny client-side board helpers (no engine logic — server is authoritative). */

import type { LegalMove, Square } from '../types'

export const PIECE_EMPTY = 0
export const PIECE_W_MAN = 1
export const PIECE_W_KING = 2
export const PIECE_B_MAN = 3
export const PIECE_B_KING = 4

export function isWhite(p: number): boolean {
  return p === PIECE_W_MAN || p === PIECE_W_KING
}
export function isBlack(p: number): boolean {
  return p === PIECE_B_MAN || p === PIECE_B_KING
}
export function isKing(p: number): boolean {
  return p === PIECE_W_KING || p === PIECE_B_KING
}
export function colorOf(p: number): 0 | 1 | null {
  if (isWhite(p)) return 0
  if (isBlack(p)) return 1
  return null
}

export function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1
}

export function sqEq(a: Square, b: Square): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

export function algebraic(sq: Square): string {
  const [r, c] = sq
  return `${String.fromCharCode(97 + c)}${8 - r}`
}

/**
 * Index legal moves by their starting square for O(1) hint lookup.
 * Also returns the set of valid source squares for the current player.
 */
export function indexLegalMoves(legal: LegalMove[]): {
  bySource: Map<string, LegalMove[]>
  sources: Set<string>
} {
  const bySource = new Map<string, LegalMove[]>()
  const sources = new Set<string>()
  for (const m of legal) {
    if (!m.path || m.path.length < 2) continue
    const k = `${m.path[0][0]},${m.path[0][1]}`
    sources.add(k)
    const arr = bySource.get(k) ?? []
    arr.push(m)
    bySource.set(k, arr)
  }
  return { bySource, sources }
}

/**
 * Given the user has selected ``selected`` and clicked through ``clickedPath``,
 * figure out which subsequent landing squares are still legal.
 * If ``clickedPath`` matches the full path of any legal move, that move is "ready".
 */
export function continuations(
  legal: LegalMove[],
  clickedPath: Square[],
): { nextSquares: Square[]; complete: LegalMove | null } {
  const matches = legal.filter((m) => {
    if (m.path.length < clickedPath.length) return false
    for (let i = 0; i < clickedPath.length; i++) {
      if (!sqEq(m.path[i], clickedPath[i])) return false
    }
    return true
  })
  const complete = matches.find((m) => m.path.length === clickedPath.length) ?? null
  const next: Square[] = []
  const seen = new Set<string>()
  for (const m of matches) {
    if (m.path.length > clickedPath.length) {
      const sq = m.path[clickedPath.length]
      const k = `${sq[0]},${sq[1]}`
      if (!seen.has(k)) {
        seen.add(k)
        next.push(sq)
      }
    }
  }
  return { nextSquares: next, complete }
}

export function formatMs(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 1) {
    const tenths = Math.floor((ms % 1000) / 100)
    return `${min}:${String(sec).padStart(2, '0')}.${tenths}`
  }
  return `${min}:${String(sec).padStart(2, '0')}`
}
