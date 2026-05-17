import type { Board, BoardState, Cell, Color, Piece, Position } from "./types";

/** Returns true if square is a playable dark cell. */
export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

/** Returns piece color or null. */
export function pieceColor(piece: Cell): Color | null {
  if (!piece) return null;
  return piece === piece.toLowerCase() ? (piece as Color) : (piece.toLowerCase() as Color);
}

/** Returns true if piece is a king. */
export function isKing(piece: Cell): boolean {
  return piece === "W" || piece === "B";
}

/** Creates initial board for Russian draughts 8x8. */
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null as Cell)
  );

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < 3) board[row][col] = "b";
      else if (row > 4) board[row][col] = "w";
    }
  }

  return board;
}

/** Creates fresh game state with white to move. */
export function createInitialState(): BoardState {
  return {
    board: createInitialBoard(),
    turn: "w",
    continuingFrom: null,
  };
}

/** Deep-clones board state. */
export function cloneState(state: BoardState): BoardState {
  return {
    board: state.board.map((row) => [...row]),
    turn: state.turn,
    continuingFrom: state.continuingFrom
      ? { ...state.continuingFrom }
      : null,
  };
}

/** Gets piece at position. */
export function getPiece(board: Board, pos: Position): Cell {
  return board[pos.row][pos.col];
}

/** Promotes man to king if on last rank. */
export function maybePromote(piece: Piece, row: number): Piece {
  if (piece === "w" && row === 0) return "W";
  if (piece === "b" && row === 7) return "B";
  if (piece === "W" || piece === "B") return piece;
  return piece;
}

/** Opponent color. */
export function opponent(color: Color): Color {
  return color === "w" ? "b" : "w";
}

/** All dark-square positions with a piece of given color. */
export function piecesForColor(board: Board, color: Color): Position[] {
  const result: Position[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!isDarkSquare(row, col)) continue;
      const p = board[row][col];
      if (p && pieceColor(p) === color) result.push({ row, col });
    }
  }
  return result;
}
