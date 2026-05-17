import {
  applyMove,
  evaluateBoard,
  getLegalMoves,
  captureCount,
  type BoardState,
  type Move,
} from "@checkers/engine";

export interface CriticalMoment {
  ply: number;
  type: "missed_capture" | "blunder" | "good";
  playedMove: string;
  bestEval: number;
  playedEval: number;
  text: string;
}

/** Finds critical plies by comparing played move eval vs best move. */
export function detectCriticalMoments(
  initialState: BoardState,
  moves: Move[]
): CriticalMoment[] {
  const moments: CriticalMoment[] = [];
  let state = initialState;

  moves.forEach((played, ply) => {
    const legal = getLegalMoves(state);
    const hadCapture = legal.some((m) => captureCount(m) > 0);
    const playedCap = captureCount(played);

    let best: Move | null = null;
    let bestEval = -Infinity;
    for (const m of legal) {
      const next = applyMove(state, m);
      const ev = evaluateBoard(next.board, state.turn);
      if (ev > bestEval) {
        bestEval = ev;
        best = m;
      }
    }

    const playedNext = applyMove(state, played);
    const playedEval = evaluateBoard(playedNext.board, state.turn);

    if (hadCapture && playedCap === 0) {
      moments.push({
        ply: ply + 1,
        type: "missed_capture",
        playedMove: JSON.stringify(played),
        bestEval,
        playedEval,
        text: `На ходу ${ply + 1} было обязательное взятие.`,
      });
    } else if (best && playedEval < bestEval - 1.5) {
      moments.push({
        ply: ply + 1,
        type: "blunder",
        playedMove: JSON.stringify(played),
        bestEval,
        playedEval,
        text: `Ход ${ply + 1} ухудшил позицию (оценка ${playedEval.toFixed(1)} vs ${bestEval.toFixed(1)}).`,
      });
    }

    state = playedNext;
  });

  return moments.slice(0, 8);
}
