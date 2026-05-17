import {
  cloneState,
  getPiece,
  isDarkSquare,
  isKing,
  maybePromote,
  opponent,
  pieceColor,
  piecesForColor,
} from "./board";
import type {
  Board,
  BoardState,
  Cell,
  Color,
  Move,
  MoveStep,
  Position,
} from "./types";

const DIAGONALS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

/** Forward row delta for a man. */
function forwardDr(color: Color): number {
  return color === "w" ? -1 : 1;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

/** Applies one step to board (mutates board copy). */
function applyStep(board: Board, step: MoveStep, color: Color): void {
  const piece = board[step.from.row][step.from.col]!;
  board[step.from.row][step.from.col] = null;

  if (step.captures) {
    for (const cap of step.captures) {
      board[cap.row][cap.col] = null;
    }
  }

  const promoted = maybePromote(piece, step.to.row);
  board[step.to.row][step.to.col] = promoted;
}

/** Quiet moves for a man (single step forward). */
function manQuietMoves(
  board: Board,
  from: Position,
  color: Color
): Move[] {
  const moves: Move[] = [];
  const dr = forwardDr(color);

  for (const dc of [-1, 1]) {
    const row = from.row + dr;
    const col = from.col + dc;
    if (!inBounds(row, col) || !isDarkSquare(row, col)) continue;
    if (board[row][col] !== null) continue;
    moves.push({
      steps: [{ from, to: { row, col } }],
    });
  }

  return moves;
}

/** Quiet moves for a king (slide along diagonals). */
function kingQuietMoves(board: Board, from: Position): Move[] {
  const moves: Move[] = [];

  for (const { dr, dc } of DIAGONALS) {
    let row = from.row + dr;
    let col = from.col + dc;
    while (inBounds(row, col) && isDarkSquare(row, col) && board[row][col] === null) {
      moves.push({
        steps: [{ from, to: { row, col } }],
      });
      row += dr;
      col += dc;
    }
  }

  return moves;
}

/** Finds all capture sequences from a position for a given piece. */
function findCaptureSequences(
  board: Board,
  from: Position,
  color: Color,
  piece: Cell
): Move[] {
  const sequences: Move[] = [];

  function dfs(
    currentBoard: Board,
    currentPos: Position,
    currentPiece: Cell,
    path: MoveStep[],
    capturedKeys: Set<string>
  ): void {
    const jumps = pieceIsKing(currentPiece)
      ? kingJumpsFrom(currentBoard, currentPos, color, capturedKeys)
      : manJumpsFrom(currentBoard, currentPos, color, capturedKeys);

    if (jumps.length === 0) {
      if (path.length > 0) sequences.push({ steps: path });
      return;
    }

    for (const jump of jumps) {
      const nextBoard = currentBoard.map((r) => [...r]);
      applyStep(nextBoard, jump, color);
      const nextPiece = nextBoard[jump.to.row][jump.to.col]!;
      const nextCaptured = new Set(capturedKeys);
      jump.captures?.forEach((c) => nextCaptured.add(posKey(c)));

      dfs(nextBoard, jump.to, nextPiece, [...path, jump], nextCaptured);
    }
  }

  dfs(
    board.map((r) => [...r]),
    from,
    piece,
    [],
    new Set()
  );

  return sequences;
}

function pieceIsKing(piece: Cell): boolean {
  return piece !== null && isKing(piece);
}

/** Man capture jumps (all 4 directions). */
function manJumpsFrom(
  board: Board,
  from: Position,
  color: Color,
  alreadyCaptured: Set<string>
): MoveStep[] {
  const steps: MoveStep[] = [];
  const piece = board[from.row][from.col]!;

  for (const { dr, dc } of DIAGONALS) {
    const midRow = from.row + dr;
    const midCol = from.col + dc;
    const landRow = from.row + dr * 2;
    const landCol = from.col + dc * 2;

    if (!inBounds(landRow, landCol) || !isDarkSquare(landRow, landCol)) continue;
    if (board[landRow][landCol] !== null) continue;

    const mid = board[midRow]?.[midCol];
    if (!mid || pieceColor(mid) === color) continue;
    if (alreadyCaptured.has(posKey({ row: midRow, col: midCol }))) continue;

    steps.push({
      from,
      to: { row: landRow, col: landCol },
      captures: [{ row: midRow, col: midCol }],
    });
  }

  return steps;
}

/** King capture jumps along diagonals. */
function kingJumpsFrom(
  board: Board,
  from: Position,
  color: Color,
  alreadyCaptured: Set<string>
): MoveStep[] {
  const steps: MoveStep[] = [];

  for (const { dr, dc } of DIAGONALS) {
    let row = from.row + dr;
    let col = from.col + dc;
    let enemy: Position | null = null;

    while (inBounds(row, col) && isDarkSquare(row, col)) {
      const cell = board[row][col];
      if (cell === null) {
        if (enemy) {
          if (!alreadyCaptured.has(posKey(enemy))) {
            steps.push({
              from,
              to: { row, col },
              captures: [enemy],
            });
          }
        }
        row += dr;
        col += dc;
        continue;
      }

      if (pieceColor(cell) === color) break;

      if (enemy) break; // two enemies in a row
      enemy = { row, col };
      row += dr;
      col += dc;
    }
  }

  return steps;
}

/** Counts total captures in a move. */
export function captureCount(move: Move): number {
  return move.steps.reduce((sum, s) => sum + (s.captures?.length ?? 0), 0);
}

/** Gets all legal moves for current state. */
export function getLegalMoves(state: BoardState): Move[] {
  const { board, turn, continuingFrom } = state;
  const positions = continuingFrom
    ? [continuingFrom]
    : piecesForColor(board, turn);

  const allCaptures: Move[] = [];

  for (const pos of positions) {
    const piece = board[pos.row][pos.col];
    if (!piece || pieceColor(piece) !== turn) continue;
    const caps = findCaptureSequences(board, pos, turn, piece);
    allCaptures.push(...caps);
  }

  if (allCaptures.length > 0) {
    const maxCap = Math.max(...allCaptures.map(captureCount));
    return allCaptures.filter((m) => captureCount(m) === maxCap);
  }

  if (continuingFrom) return [];

  const quiet: Move[] = [];
  for (const pos of positions) {
    const piece = board[pos.row][pos.col];
    if (!piece || pieceColor(piece) !== turn) continue;
    if (isKing(piece)) quiet.push(...kingQuietMoves(board, pos));
    else quiet.push(...manQuietMoves(board, pos, turn));
  }

  return quiet;
}

/** Applies a full move and returns new state. */
export function applyMove(state: BoardState, move: Move): BoardState {
  const legal = getLegalMoves(state);
  const key = moveKey(move);
  if (!legal.some((m) => moveKey(m) === key)) {
    throw new Error("Illegal move");
  }

  const next = cloneState(state);
  let board = next.board;

  for (const step of move.steps) {
    const b = board.map((r) => [...r]);
    applyStep(b, step, state.turn);
    board = b;
  }

  return {
    board,
    turn: opponent(state.turn),
    continuingFrom: null,
  };
}

/** Stable string key for move comparison. */
export function moveKey(move: Move): string {
  return move.steps
    .map(
      (s) =>
        `${s.from.row},${s.from.col}->${s.to.row},${s.to.col}:${(s.captures ?? [])
          .map((c) => `${c.row},${c.col}`)
          .join("|")}`
    )
    .join(";");
}

/** Returns positions reachable as first step of legal moves from a square. */
export function getTargetsFrom(
  state: BoardState,
  from: Position
): Position[] {
  const moves = getLegalMoves(state).filter(
    (m) =>
      m.steps[0].from.row === from.row && m.steps[0].from.col === from.col
  );
  const keys = new Set<string>();
  const targets: Position[] = [];
  for (const m of moves) {
    const t = m.steps[0].to;
    const k = posKey(t);
    if (!keys.has(k)) {
      keys.add(k);
      targets.push(t);
    }
  }
  return targets;
}
