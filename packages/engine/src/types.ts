/** Color of the side to move or piece owner. */
export type Color = "w" | "b";

/** Cell piece: lowercase = man, uppercase = king. */
export type Piece = "w" | "b" | "W" | "B";

export type Cell = Piece | null;

/** 8x8 board; only dark squares (row+col odd) are playable. */
export type Board = Cell[][];

export interface Position {
  row: number;
  col: number;
}

export interface MoveStep {
  from: Position;
  to: Position;
  captures?: Position[];
}

/** A complete turn (may include multiple jumps). */
export interface Move {
  steps: MoveStep[];
}

export interface BoardState {
  board: Board;
  turn: Color;
  /** If mid-capture sequence, piece that must continue. */
  continuingFrom: Position | null;
}

export type GameEndReason =
  | "checkmate"
  | "stalemate"
  | "resign"
  | "timeout"
  | "draw";

export interface GameOverResult {
  over: true;
  winner: Color | null;
  reason: GameEndReason;
}

export interface GameContinues {
  over: false;
}

export type GameStatus = GameOverResult | GameContinues;
