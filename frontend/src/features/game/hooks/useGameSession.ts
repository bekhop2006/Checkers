"use client";

import {
  applyMove,
  createInitialState,
  getGameStatus,
  getHintMove,
  type BoardState,
  type Move,
} from "@checkers/engine";
import { useCallback, useState } from "react";
import {
  loadLocalGame,
  saveLocalGame,
  clearLocalGame,
} from "../storage";

/** Manages local board state, moves, and persistence. */
export function useGameSession(persistKey = "local") {
  const [state, setState] = useState<BoardState>(() => {
    if (typeof window !== "undefined") {
      const saved = loadLocalGame(persistKey);
      if (saved) return saved.state;
    }
    return createInitialState();
  });
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const status = getGameStatus(state);

  const apply = useCallback(
    (move: Move) => {
      const next = applyMove(state, move);
      setState(next);
      setLastMove(move);
      setHistory((h) => [...h, JSON.stringify(move)]);
      if (persistKey) saveLocalGame(persistKey, next, history);
      return next;
    },
    [state, persistKey, history]
  );

  const reset = useCallback(() => {
    const initial = createInitialState();
    setState(initial);
    setLastMove(null);
    setHistory([]);
    clearLocalGame(persistKey);
  }, [persistKey]);

  const hint = useCallback(() => getHintMove(state), [state]);

  return {
    state,
    lastMove,
    history,
    status,
    apply,
    reset,
    hint,
    setState,
  };
}
