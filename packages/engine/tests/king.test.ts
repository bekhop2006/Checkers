import { describe, it, expect } from "vitest";
import { getLegalMoves, applyMove } from "../src";
import type { Board, BoardState } from "../src/types";

describe("king", () => {
  it("king can slide multiple squares", () => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null)
    );
    board[4][3] = "W";

    const state: BoardState = { board, turn: "w", continuingFrom: null };
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(1);
  });

  it("promotes man on last rank", () => {
    const board: Board = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => null)
    );
    board[1][2] = "w";
    board[0][1] = null;

    const state: BoardState = { board, turn: "w", continuingFrom: null };
    const moves = getLegalMoves(state);
    const toKing = moves.find((m) => m.steps[0].to.row === 0);
    expect(toKing).toBeDefined();
    const next = applyMove(state, toKing!);
    expect(next.board[0][1]).toBe("W");
  });
});
