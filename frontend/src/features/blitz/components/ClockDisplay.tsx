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
          "px-4 py-2 rounded-xl glass-card font-semibold tabular-nums",
          turn === "w" && "ring-2 ring-brand-500"
        )}
      >
        <span className="text-xs text-stone-500 block font-sans font-medium">Белые</span>
        {formatClock(whiteMs)}
      </div>
      <div
        className={cn(
          "px-4 py-2 rounded-xl glass-card font-semibold tabular-nums",
          turn === "b" && "ring-2 ring-brand-500"
        )}
      >
        <span className="text-xs text-stone-500 block font-sans font-medium">Чёрные</span>
        {formatClock(blackMs)}
      </div>
    </div>
  );
}
