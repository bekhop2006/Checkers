"""Game-outcome detection (win/loss/draw) for Russian draughts."""

from __future__ import annotations

from dataclasses import dataclass

from .board import Board, Color
from .moves import generate_legal_moves


@dataclass(frozen=True)
class GameOutcome:
    is_over: bool
    winner: Color | None  # None means draw or not-yet-over
    reason: str  # short machine-readable label


REASON_NO_PIECES = "no_pieces"
REASON_NO_MOVES = "no_moves"
REASON_REPETITION = "threefold_repetition"
REASON_PROGRESS_RULE = "progress_rule_50"
REASON_AGREED_DRAW = "agreed_draw"
REASON_RESIGN = "resign"
REASON_TIMEOUT = "timeout"


def game_outcome(board: Board) -> GameOutcome:
    """Compute the terminal state of ``board`` (purely from board state).

    Time-control losses and agreed draws are *not* derived here — call sites
    that know about clocks/resignations should construct a GameOutcome
    directly with the appropriate reason.
    """

    white_men, white_kings = board.count(Color.WHITE)
    black_men, black_kings = board.count(Color.BLACK)

    if white_men + white_kings == 0:
        return GameOutcome(True, Color.BLACK, REASON_NO_PIECES)
    if black_men + black_kings == 0:
        return GameOutcome(True, Color.WHITE, REASON_NO_PIECES)

    if not generate_legal_moves(board):
        return GameOutcome(True, board.turn.opponent, REASON_NO_MOVES)

    if board.history.count(board.position_key()) >= 3:
        return GameOutcome(True, None, REASON_REPETITION)

    if board.plies_since_progress >= 50:
        return GameOutcome(True, None, REASON_PROGRESS_RULE)

    return GameOutcome(False, None, "")
