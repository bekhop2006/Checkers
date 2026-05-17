"use client";

import { CheckersBoard } from "@/features/board/components/CheckersBoard";
import { GameControls } from "@/features/game/components/GameControls";
import { useGameSession } from "@/features/game/hooks/useGameSession";
import { useState } from "react";
import type { Position } from "@checkers/engine";

/** Local hot-seat two player game. */
export default function LocalPlayPage() {
  const { state, lastMove, status, apply, reset, hint } = useGameSession("local");
  const [hintTarget, setHintTarget] = useState<Position | null>(null);

  const onHint = () => {
    const m = hint();
    if (m) setHintTarget(m.steps[0].to);
    setTimeout(() => setHintTarget(null), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Локальная игра</h1>
      <p className="text-stone-500">
        Ход: {state.turn === "w" ? "Белые" : "Чёрные"}
        {status.over &&
          ` — ${status.winner ? (status.winner === "w" ? "Белые" : "Чёрные") + " выиграли" : "Ничья"}`}
      </p>
      <CheckersBoard
        state={state}
        onMove={apply}
        lastMove={lastMove}
        hintTarget={hintTarget}
        disabled={status.over}
      />
      <GameControls onReset={reset} onHint={onHint} hintDisabled={status.over} />
    </div>
  );
}
