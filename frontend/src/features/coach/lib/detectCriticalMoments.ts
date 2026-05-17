import {
  applyMove,
  evaluateBoard,
  getLegalMoves,
  captureCount,
  type BoardState,
  type Move,
} from "@checkers/engine";
import type { CoachMoment } from "@checkers/shared-types";

/** Finds critical plies by comparing played move eval vs best move. */
export function detectCriticalMoments(
  initialState: BoardState,
  moves: Move[]
): CoachMoment[] {
  const moments: CoachMoment[] = [];
  let state = initialState;

  moves.forEach((played, index) => {
    const legal = getLegalMoves(state);
    const hadCapture = legal.some((m) => captureCount(m) > 0);
    const playedCap = captureCount(played);

    let bestEval = -Infinity;
    for (const m of legal) {
      const next = applyMove(state, m);
      const ev = evaluateBoard(next.board, state.turn);
      if (ev > bestEval) bestEval = ev;
    }

    const playedNext = applyMove(state, played);
    const playedEval = evaluateBoard(playedNext.board, state.turn);
    const ply = index + 1;

    if (hadCapture && playedCap === 0) {
      moments.push({
        ply,
        type: "missed_capture",
        playedMove: JSON.stringify(played),
        bestEval,
        playedEval,
        text: `На ходу ${ply} было обязательное взятие.`,
      });
    } else if (playedEval < bestEval - 1.5) {
      moments.push({
        ply,
        type: "blunder",
        playedMove: JSON.stringify(played),
        bestEval,
        playedEval,
        text: `Ход ${ply} ухудшил позицию (оценка ${playedEval.toFixed(1)} vs ${bestEval.toFixed(1)}).`,
      });
    }

    state = playedNext;
  });

  return moments.slice(0, 8);
}
