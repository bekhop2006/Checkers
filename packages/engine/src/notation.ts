import type { Move, Position } from "./types";

/** Converts position to algebraic-like notation (a1-h8 on dark squares). */
export function positionToNotation(pos: Position): string {
  const file = String.fromCharCode(97 + pos.col);
  const rank = 8 - pos.row;
  return `${file}${rank}`;
}

/** Serializes move to simple notation string. */
export function moveToNotation(move: Move): string {
  const first = move.steps[0];
  const last = move.steps[move.steps.length - 1];
  const caps = move.steps.flatMap((s) => s.captures ?? []);
  const capStr = caps.length ? `x${caps.map(positionToNotation).join("x")}` : "";
  return `${positionToNotation(first.from)}-${positionToNotation(last.to)}${capStr}`;
}
