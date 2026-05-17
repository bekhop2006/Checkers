"use client";

import { CheckersBoard } from "@/features/board/components/CheckersBoard";
import { GameControls } from "@/features/game/components/GameControls";
import { useGameSession } from "@/features/game/hooks/useGameSession";
import { findBestMove, getHintMove } from "@checkers/engine";
import { useEffect, useState } from "react";
import type { Position } from "@checkers/engine";

const DEPTHS = [2, 4, 6, 8];

/** Play vs AI with selectable difficulty. */
export default function AiPlayPage() {
  const { state, lastMove, status, apply, reset } = useGameSession("ai");
  const [level, setLevel] = useState(1);
  const [hintTarget, setHintTarget] = useState<Position | null>(null);
  const humanColor = "w" as const;

  useEffect(() => {
    if (status.over || state.turn === humanColor) return;
    const timer = setTimeout(() => {
      const move = findBestMove(state, DEPTHS[level]);
      if (move) apply(move);
    }, 400);
    return () => clearTimeout(timer);
  }, [state, status.over, level, apply, humanColor]);

  const onHint = () => {
    const m = getHintMove(state);
    if (m) setHintTarget(m.steps[0].to);
    setTimeout(() => setHintTarget(null), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Против AI</h1>
      <div className="flex gap-2">
        {DEPTHS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLevel(i)}
            className={`px-3 py-1 rounded-lg text-sm ${
              level === i
                ? "bg-amber-600 text-white"
                : "bg-stone-200 dark:bg-stone-800"
            }`}
          >
            Ур. {i + 1}
          </button>
        ))}
      </div>
      <CheckersBoard
        state={state}
        onMove={apply}
        lastMove={lastMove}
        hintTarget={hintTarget}
        disabled={status.over || state.turn !== humanColor}
        orientation="w"
      />
      <GameControls onReset={reset} onHint={onHint} hintDisabled={status.over} />
    </div>
  );
}
