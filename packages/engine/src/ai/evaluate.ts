import { isKing, pieceColor } from "../board";
import type { Board, Color } from "../types";

/** Material evaluation from perspective of color (+ = good for color). */
export function evaluateBoard(board: Board, forColor: Color): number {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (!p) continue;
      const sign = pieceColor(p) === forColor ? 1 : -1;
      const val = isKing(p) ? 3 : 1;
      const centerBonus =
        Math.abs(3.5 - row) + Math.abs(3.5 - col) < 4 ? 0.05 : 0;
      score += sign * (val + centerBonus);
    }
  }

  return score;
}
