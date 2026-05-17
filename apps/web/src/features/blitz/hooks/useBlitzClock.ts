"use client";

import { useEffect, useState, useCallback } from "react";
import type { Color } from "@checkers/engine";

const BLITZ_MS = 180_000;

/** Tracks blitz clocks for both players. */
export function useBlitzClock(
  active: boolean,
  turn: Color,
  initial?: { whiteMs: number; blackMs: number }
) {
  const [clocks, setClocks] = useState(
    initial ?? { whiteMs: BLITZ_MS, blackMs: BLITZ_MS }
  );

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setClocks((c) => {
        if (turn === "w") {
          const whiteMs = Math.max(0, c.whiteMs - 100);
          return { ...c, whiteMs };
        }
        const blackMs = Math.max(0, c.blackMs - 100);
        return { ...c, blackMs };
      });
    }, 100);
    return () => clearInterval(id);
  }, [active, turn]);

  const reset = useCallback(() => {
    setClocks({ whiteMs: BLITZ_MS, blackMs: BLITZ_MS });
  }, []);

  const timedOut = clocks.whiteMs === 0 ? "w" : clocks.blackMs === 0 ? "b" : null;

  return { clocks, reset, timedOut, setClocks };
}

/** Formats ms as M:SS. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
