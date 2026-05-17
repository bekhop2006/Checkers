import type { BoardState } from "@checkers/engine";

const PREFIX = "blitz-checkers:";

interface SavedGame {
  state: BoardState;
  history: string[];
  savedAt: number;
}

/** Saves in-progress local game to LocalStorage. */
export function saveLocalGame(
  key: string,
  state: BoardState,
  history: string[]
) {
  if (typeof window === "undefined") return;
  const data: SavedGame = { state, history, savedAt: Date.now() };
  localStorage.setItem(PREFIX + key, JSON.stringify(data));
}

/** Loads saved local game or null. */
export function loadLocalGame(key: string): SavedGame | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedGame;
  } catch {
    return null;
  }
}

/** Clears saved local game. */
export function clearLocalGame(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFIX + key);
}
