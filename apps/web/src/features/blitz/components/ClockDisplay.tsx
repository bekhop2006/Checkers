"use client";

import { formatClock } from "../hooks/useBlitzClock";
import { cn } from "@/shared/lib/utils";

interface ClockDisplayProps {
  whiteMs: number;
  blackMs: number;
  turn: "w" | "b";
}

/** Shows both player blitz clocks. */
export function ClockDisplay({ whiteMs, blackMs, turn }: ClockDisplayProps) {
  return (
    <div className="flex justify-between gap-4 w-full max-w-md font-mono text-lg">
      <div
        className={cn(
          "px-3 py-1 rounded-lg bg-stone-800 text-white",
          turn === "w" && "ring-2 ring-amber-400"
        )}
      >
        <span className="text-xs text-stone-400 block">Белые</span>
        {formatClock(whiteMs)}
      </div>
      <div
        className={cn(
          "px-3 py-1 rounded-lg bg-stone-800 text-white",
          turn === "b" && "ring-2 ring-amber-400"
        )}
      >
        <span className="text-xs text-stone-400 block">Чёрные</span>
        {formatClock(blackMs)}
      </div>
    </div>
  );
}
