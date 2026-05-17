"""Static evaluation function for Russian draughts.

Returns a centipawn-equivalent value from the side-to-move's perspective.
Positive = good for side to move, negative = bad.
"""

from __future__ import annotations

from .board import BOARD_SIZE, Board, Color, Piece, is_dark

MAN_VALUE = 100
KING_VALUE = 300

WHITE_MAN_ROW_BONUS = (0, 20, 14, 9, 5, 2, 0, 0)  # row 0..7 for white men (0 = crowned, already counted via king)
BLACK_MAN_ROW_BONUS = (0, 0, 2, 5, 9, 14, 20, 0)


def evaluate_position(board: Board) -> int:
    """Static evaluation from the side-to-move's perspective."""
    white_score = 0
    black_score = 0

    for (r, c), piece in board.iter_pieces():
        if piece is Piece.WHITE_MAN:
            white_score += MAN_VALUE + WHITE_MAN_ROW_BONUS[r]
            white_score += _center_bonus(r, c)
        elif piece is Piece.WHITE_KING:
            white_score += KING_VALUE + _king_mobility_bonus(board, (r, c), Color.WHITE)
        elif piece is Piece.BLACK_MAN:
            black_score += MAN_VALUE + BLACK_MAN_ROW_BONUS[r]
            black_score += _center_bonus(r, c)
        elif piece is Piece.BLACK_KING:
            black_score += KING_VALUE + _king_mobility_bonus(board, (r, c), Color.BLACK)

    score = white_score - black_score
    if board.turn is Color.WHITE:
        return score + 3
    return -score + 3


def _center_bonus(r: int, c: int) -> int:
    if 2 <= r <= 5 and 2 <= c <= 5:
        return 4
    if c == 0 or c == BOARD_SIZE - 1:
        return -2
    return 0


def _king_mobility_bonus(board: Board, sq: tuple[int, int], color: Color) -> int:
    bonus = 0
    for dr, dc in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        r, c = sq[0] + dr, sq[1] + dc
        while 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and is_dark((r, c)):
            if board.cells[r][c] is not Piece.EMPTY:
                break
            bonus += 1
            r, c = r + dr, c + dc
    return min(bonus, 12)
