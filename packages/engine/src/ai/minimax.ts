import { evaluateBoard } from "./evaluate";
import { applyMove, getLegalMoves } from "../moves";
import { getGameStatus } from "../game-over";
import { opponent } from "../board";
import type { BoardState, Color, Move } from "../types";

/** Picks best move for side to move using minimax with alpha-beta. */
export function findBestMove(state: BoardState, depth: number): Move | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -Infinity, Infinity, state.turn);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function negamax(
  state: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  rootColor: Color
): number {
  const status = getGameStatus(state);
  if (status.over) {
    if (status.winner === rootColor) return 1000 + depth;
    if (status.winner === null) return 0;
    return -1000 - depth;
  }

  if (depth === 0) {
    return evaluateBoard(state.board, rootColor);
  }

  const moves = getLegalMoves(state);
  let best = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, rootColor);
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }

  return best;
}

/** Suggests hint move at lower depth. */
export function getHintMove(state: BoardState): Move | null {
  return findBestMove(state, 2);
}
