import { getLegalMoves } from "./moves";
import { opponent } from "./board";
import type { BoardState, GameStatus, Color } from "./types";

/** Determines if the game has ended. */
export function getGameStatus(state: BoardState): GameStatus {
  const moves = getLegalMoves(state);
  if (moves.length > 0) return { over: false };

  return {
    over: true,
    winner: opponent(state.turn),
    reason: "stalemate",
  };
}

/** Builds game-over from resign or timeout. */
export function gameOverWithWinner(
  winner: Color,
  reason: "resign" | "timeout" | "checkmate" | "draw"
): GameStatus {
  return {
    over: true,
    winner: reason === "draw" ? null : winner,
    reason,
  };
}

/** Returns true if game is over. */
export function isGameOver(state: BoardState): boolean {
  return getGameStatus(state).over === true;
}
