import { describe, it, expect } from "vitest";
import {
  createInitialState,
  getLegalMoves,
  applyMove,
  captureCount,
} from "../src";
import type { Board, BoardState } from "../src/types";

describe("captures", () => {
  it("requires capture when available", () => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null)
    );
    board[5][4] = "w";
    board[4][3] = "b";
    board[3][2] = null;

    const state: BoardState = { board, turn: "w", continuingFrom: null };
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => captureCount(m) > 0)).toBe(true);
  });

  it("applies a simple capture", () => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null)
    );
    board[5][4] = "w";
    board[4][3] = "b";
    board[3][2] = null;

    const state: BoardState = { board, turn: "w", continuingFrom: null };
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    const next = applyMove(state, moves[0]);
    expect(next.board[3][2]).toBe("w");
    expect(next.board[4][3]).toBe(null);
    expect(next.turn).toBe("b");
  });
});

describe("initial game", () => {
  it("has legal moves for white", () => {
    const state = createInitialState();
    const moves = getLegalMoves(state);
    expect(moves.length).toBe(7);
    expect(moves.every((m) => captureCount(m) === 0)).toBe(true);
  });
});
