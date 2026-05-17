"""Move generation and application for Russian draughts.

Russian-draughts specifics implemented here:

* Men move 1 diagonal step forward; kings move any distance along a diagonal.
* Captures are mandatory: if any capture exists, only captures are legal.
* Men can capture both forward AND backward (Russian rule).
* Multi-jumps continue while the same piece can keep capturing.
* Captured pieces remain on the board during the chain (they block diagonals
  and cannot be re-captured); they are removed atomically at the chain's end.
* Mid-chain promotion: if a man reaches the last rank DURING a multi-jump
  and can keep capturing, it becomes a king immediately and continues as a king.
* No "maximum captures" preference — any legal capture sequence is allowed.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .board import (
    BOARD_SIZE,
    Board,
    Color,
    Piece,
    Square,
    in_bounds,
    square_to_algebraic,
)

DIAGS: tuple[tuple[int, int], ...] = ((-1, -1), (-1, 1), (1, -1), (1, 1))


@dataclass(frozen=True)
class Move:
    """A complete move (single step or capture chain).

    For a non-capture move ``path = [start, end]`` and ``captured`` is empty.
    For a capture move ``path = [start, landing1, landing2, ...]`` and
    ``captured`` lists the captured enemy squares in order.
    """

    path: tuple[Square, ...]
    captured: tuple[Square, ...] = ()
    promoted: bool = False

    @property
    def start(self) -> Square:
        return self.path[0]

    @property
    def end(self) -> Square:
        return self.path[-1]

    @property
    def is_capture(self) -> bool:
        return len(self.captured) > 0

    def to_algebraic(self) -> str:
        sep = "x" if self.is_capture else "-"
        return sep.join(square_to_algebraic(s) for s in self.path)


# --- helpers ----------------------------------------------------------------


def _forward_dr(color: Color) -> int:
    return -1 if color is Color.WHITE else 1


def _promotes(piece: Piece, dest: Square) -> bool:
    if piece is Piece.WHITE_MAN and dest[0] == 0:
        return True
    if piece is Piece.BLACK_MAN and dest[0] == BOARD_SIZE - 1:
        return True
    return False


def _promote(piece: Piece) -> Piece:
    if piece is Piece.WHITE_MAN:
        return Piece.WHITE_KING
    if piece is Piece.BLACK_MAN:
        return Piece.BLACK_KING
    return piece


# --- capture chain exploration ---------------------------------------------


@dataclass
class _ChainState:
    path: list[Square] = field(default_factory=list)
    captured: list[Square] = field(default_factory=list)
    piece: Piece = Piece.EMPTY  # current effective piece (may have promoted)
    promoted: bool = False


def _explore_captures(
    board: Board, start_sq: Square, start_piece: Piece
) -> list[Move]:
    """Return every maximal capture chain that starts at ``start_sq``.

    Captured pieces stay on the board during exploration (so they continue
    to block diagonals and can't be re-captured); the moving piece is "lifted"
    from its starting square so it doesn't block itself.
    """

    working = board.clone()
    working.set(start_sq, Piece.EMPTY)
    chains: list[Move] = []

    def recurse(state: _ChainState) -> None:
        cur_sq = state.path[-1]
        extended = False

        for dr, dc in DIAGS:
            if state.piece.is_king:
                # Scan along the diagonal for the first non-empty square.
                r, c = cur_sq[0] + dr, cur_sq[1] + dc
                enemy_sq: Square | None = None
                while in_bounds((r, c)):
                    cell = working.get((r, c))
                    if cell is Piece.EMPTY:
                        r, c = r + dr, c + dc
                        continue
                    # Occupied. Blocked by own colour or already-captured enemy.
                    if cell.color is state.piece.color:
                        break
                    if (r, c) in state.captured:
                        break
                    enemy_sq = (r, c)
                    break
                if enemy_sq is None:
                    continue
                # Scan landing squares beyond the enemy along same diagonal.
                lr, lc = enemy_sq[0] + dr, enemy_sq[1] + dc
                while in_bounds((lr, lc)):
                    cell = working.get((lr, lc))
                    if cell is not Piece.EMPTY:
                        break  # blocked (either own piece, captured enemy, or fresh enemy)
                    extended = True
                    new_state = _ChainState(
                        path=state.path + [(lr, lc)],
                        captured=state.captured + [enemy_sq],
                        piece=state.piece,
                        promoted=state.promoted,
                    )
                    recurse(new_state)
                    lr, lc = lr + dr, lc + dc
            else:
                # Man jump: enemy is 1 diag away, landing is 2 diag away.
                er, ec = cur_sq[0] + dr, cur_sq[1] + dc
                lr, lc = cur_sq[0] + 2 * dr, cur_sq[1] + 2 * dc
                if not in_bounds((lr, lc)):
                    continue
                enemy_cell = working.get((er, ec))
                if enemy_cell.color is None or enemy_cell.color is state.piece.color:
                    continue
                if (er, ec) in state.captured:
                    continue
                if working.get((lr, lc)) is not Piece.EMPTY:
                    continue
                next_piece = state.piece
                promoted = state.promoted
                if _promotes(state.piece, (lr, lc)):
                    next_piece = _promote(state.piece)
                    promoted = True
                extended = True
                new_state = _ChainState(
                    path=state.path + [(lr, lc)],
                    captured=state.captured + [(er, ec)],
                    piece=next_piece,
                    promoted=promoted,
                )
                recurse(new_state)

        if not extended and state.captured:
            chains.append(
                Move(
                    path=tuple(state.path),
                    captured=tuple(state.captured),
                    promoted=state.promoted,
                )
            )

    recurse(
        _ChainState(path=[start_sq], captured=[], piece=start_piece, promoted=False)
    )
    return chains


# --- non-capture quiet moves -----------------------------------------------


def _quiet_moves(board: Board, sq: Square, piece: Piece) -> list[Move]:
    moves: list[Move] = []
    if piece.is_king:
        for dr, dc in DIAGS:
            r, c = sq[0] + dr, sq[1] + dc
            while in_bounds((r, c)) and board.get((r, c)) is Piece.EMPTY:
                moves.append(Move(path=(sq, (r, c))))
                r, c = r + dr, c + dc
    else:
        dr = _forward_dr(piece.color)  # type: ignore[arg-type]
        for dc in (-1, 1):
            target = (sq[0] + dr, sq[1] + dc)
            if not in_bounds(target):
                continue
            if board.get(target) is not Piece.EMPTY:
                continue
            promoted = _promotes(piece, target)
            moves.append(Move(path=(sq, target), promoted=promoted))
    return moves


# --- public API -------------------------------------------------------------


def generate_legal_moves(board: Board) -> list[Move]:
    """Return every legal move for the side to move.

    If any capture exists, only captures are returned (mandatory capture rule).
    """

    captures: list[Move] = []
    quiets: list[Move] = []

    for sq, piece in board.iter_pieces(board.turn):
        captures.extend(_explore_captures(board, sq, piece))
        if not captures:  # only build quiets while we have no captures so far
            quiets.extend(_quiet_moves(board, sq, piece))
        # If we just found captures, drop any earlier quiets.
        if captures and quiets:
            quiets = []

    if captures:
        return captures
    return quiets


def apply_move(board: Board, move: Move) -> Board:
    """Apply ``move`` to ``board`` and return the new state.

    The new board has switched ``turn``, removed captured pieces, applied any
    promotion, and updated ``plies_since_progress`` + ``history`` for draw
    detection.
    """

    nb = board.clone()
    piece = nb.get(move.start)
    if piece is Piece.EMPTY:
        raise ValueError(f"no piece at {square_to_algebraic(move.start)}")

    # Lift and place.
    nb.set(move.start, Piece.EMPTY)
    # Walk through path purely to validate (path squares should all be empty
    # except possibly the start). We don't need to do anything per-step.
    for cap_sq in move.captured:
        nb.set(cap_sq, Piece.EMPTY)

    final_piece = piece
    # Promotion: either set by mid-chain logic (move.promoted) or by reaching
    # the back rank at the end of a quiet move.
    if move.promoted or _promotes(piece, move.end):
        final_piece = _promote(piece)
    nb.set(move.end, final_piece)

    # Progress tracking (draw rules).
    if move.is_capture or piece.is_man:
        nb.plies_since_progress = 0
    else:
        nb.plies_since_progress += 1

    nb.turn = nb.turn.opponent
    nb.history.append(nb.position_key())
    return nb
