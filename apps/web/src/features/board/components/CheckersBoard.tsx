"use client";

import {
  getLegalMoves,
  getTargetsFrom,
  isDarkSquare,
  pieceColor,
  isKing,
  type BoardState,
  type Color,
  type Move,
  type Position,
} from "@checkers/engine";
import { cn } from "@/shared/lib/utils";
import { useMemo, useState, useCallback } from "react";

interface CheckersBoardProps {
  state: BoardState;
  onMove: (move: Move) => void;
  orientation?: Color;
  disabled?: boolean;
  lastMove?: Move | null;
  hintTarget?: Position | null;
  skin?: "classic" | "neon";
}

/** Interactive 8x8 checkers board with move highlighting. */
export function CheckersBoard({
  state,
  onMove,
  orientation = "w",
  disabled = false,
  lastMove = null,
  hintTarget = null,
  skin = "classic",
}: CheckersBoardProps) {
  const [selected, setSelected] = useState<Position | null>(null);

  const targets = useMemo(() => {
    if (!selected || disabled) return [];
    return getTargetsFrom(state, selected);
  }, [state, selected, disabled]);

  const targetSet = useMemo(
    () => new Set(targets.map((t) => `${t.row},${t.col}`)),
    [targets]
  );

  const handleSquare = useCallback(
    (row: number, col: number) => {
      if (disabled || !isDarkSquare(row, col)) return;
      const pos = { row, col };
      const piece = state.board[row][col];

      if (selected) {
        if (targetSet.has(`${row},${col}`)) {
          const moves = getLegalMoves(state).filter(
            (m) =>
              m.steps[0].from.row === selected.row &&
              m.steps[0].from.col === selected.col &&
              m.steps[0].to.row === row &&
              m.steps[0].to.col === col
          );
          if (moves[0]) {
            onMove(moves[0]);
            setSelected(null);
          }
        } else if (piece && pieceColor(piece) === state.turn) {
          setSelected(pos);
        } else {
          setSelected(null);
        }
      } else if (piece && pieceColor(piece) === state.turn) {
        setSelected(pos);
      }
    },
    [disabled, state, selected, targetSet, onMove]
  );

  const rows =
    orientation === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div
      className={cn(
        "grid grid-cols-8 gap-0 rounded-xl overflow-hidden shadow-2xl border-4",
        skin === "neon" ? "border-cyan-500/50" : "border-amber-900/40"
      )}
    >
      {rows.map((row) =>
        [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
          const dark = isDarkSquare(row, col);
          const piece = state.board[row][col];
          const isSelected =
            selected?.row === row && selected?.col === col;
          const isTarget = targetSet.has(`${row},${col}`);
          const isLast =
            lastMove &&
            (lastMove.steps[0].from.row === row &&
              lastMove.steps[0].from.col === col ||
              lastMove.steps[lastMove.steps.length - 1].to.row === row &&
                lastMove.steps[lastMove.steps.length - 1].to.col === col);
          const isHint =
            hintTarget?.row === row && hintTarget?.col === col;

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              disabled={disabled || !dark}
              onClick={() => handleSquare(row, col)}
              className={cn(
                "aspect-square w-[min(11vw,52px)] sm:w-14 flex items-center justify-center transition-colors",
                !dark && "bg-stone-200 dark:bg-stone-800",
                dark &&
                  (skin === "neon"
                    ? "bg-slate-800"
                    : "bg-amber-800/90 dark:bg-amber-950"),
                isSelected && "ring-2 ring-inset ring-yellow-400",
                isTarget && "bg-green-500/40",
                isLast && "bg-yellow-500/30",
                isHint && "ring-2 ring-cyan-400"
              )}
            >
              {piece && dark && (
                <span
                  className={cn(
                    "w-[75%] h-[75%] rounded-full shadow-md border-2",
                    pieceColor(piece) === "w"
                      ? "bg-gradient-to-br from-stone-100 to-stone-300 border-stone-400"
                      : "bg-gradient-to-br from-stone-700 to-stone-900 border-stone-950",
                    isKing(piece) &&
                      "ring-2 ring-yellow-500 after:content-['♔'] after:absolute after:text-xs"
                  )}
                />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
