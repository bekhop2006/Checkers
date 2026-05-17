"""Board state and basic primitives for Russian draughts (8x8).

Coordinate system
-----------------
Internal coords are ``(row, col)`` with ``row=0`` at the top of the screen
(black's back rank) and ``row=7`` at the bottom (white's back rank).
Algebraic squares follow standard checkers: ``a1`` is white's back-left =
``(7, 0)``, ``h8`` is black's back-right = ``(0, 7)``.
Only dark squares (``(row+col) % 2 == 1``) are playable.

White moves towards row 0 (its kings rank). Black moves towards row 7.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Iterable

Square = tuple[int, int]  # (row, col)

BOARD_SIZE = 8


class Color(IntEnum):
    WHITE = 0
    BLACK = 1

    @property
    def opponent(self) -> "Color":
        return Color.BLACK if self is Color.WHITE else Color.WHITE


class Piece(IntEnum):
    EMPTY = 0
    WHITE_MAN = 1
    WHITE_KING = 2
    BLACK_MAN = 3
    BLACK_KING = 4

    @property
    def color(self) -> Color | None:
        if self in (Piece.WHITE_MAN, Piece.WHITE_KING):
            return Color.WHITE
        if self in (Piece.BLACK_MAN, Piece.BLACK_KING):
            return Color.BLACK
        return None

    @property
    def is_king(self) -> bool:
        return self in (Piece.WHITE_KING, Piece.BLACK_KING)

    @property
    def is_man(self) -> bool:
        return self in (Piece.WHITE_MAN, Piece.BLACK_MAN)


PIECE_CHARS = {
    Piece.EMPTY: ".",
    Piece.WHITE_MAN: "w",
    Piece.WHITE_KING: "W",
    Piece.BLACK_MAN: "b",
    Piece.BLACK_KING: "B",
}
CHAR_PIECES = {v: k for k, v in PIECE_CHARS.items()}


def is_dark(sq: Square) -> bool:
    """Dark (playable) squares are those where ``(row + col) % 2 == 1``."""
    r, c = sq
    return (r + c) % 2 == 1


def in_bounds(sq: Square) -> bool:
    r, c = sq
    return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


def square_to_algebraic(sq: Square) -> str:
    r, c = sq
    return f"{chr(ord('a') + c)}{8 - r}"


def algebraic_to_square(s: str) -> Square:
    s = s.strip().lower()
    if len(s) != 2:
        raise ValueError(f"bad square: {s!r}")
    col = ord(s[0]) - ord("a")
    row = 8 - int(s[1])
    if not in_bounds((row, col)):
        raise ValueError(f"square out of board: {s!r}")
    return (row, col)


@dataclass
class Board:
    """Mutable 8x8 board state."""

    # row-major, 8x8 grid of Piece values
    cells: list[list[Piece]] = field(
        default_factory=lambda: [[Piece.EMPTY] * BOARD_SIZE for _ in range(BOARD_SIZE)]
    )
    turn: Color = Color.WHITE
    # Halfmoves since the last capture or man move (for the 15/50-move draw rule).
    plies_since_progress: int = 0
    # Position history for 3-fold repetition (we store stringified positions).
    history: list[str] = field(default_factory=list)

    # ---- factories / IO ---------------------------------------------------
    @classmethod
    def initial(cls) -> "Board":
        b = cls()
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if not is_dark((r, c)):
                    continue
                if r < 3:
                    b.cells[r][c] = Piece.BLACK_MAN
                elif r > 4:
                    b.cells[r][c] = Piece.WHITE_MAN
        b.turn = Color.WHITE
        b.history.append(b.position_key())
        return b

    @classmethod
    def from_ascii(cls, text: str, turn: Color = Color.WHITE) -> "Board":
        """Build a board from a multi-line ascii diagram.

        Each non-empty line should have 8 characters using
        ``. w W b B`` (dot = empty). Rows are top to bottom. Used by tests.
        """
        b = cls()
        rows = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
        if len(rows) != BOARD_SIZE:
            raise ValueError(f"expected 8 rows, got {len(rows)}")
        for r, line in enumerate(rows):
            chars = [ch for ch in line if ch in CHAR_PIECES]
            if len(chars) != BOARD_SIZE:
                raise ValueError(f"row {r} has {len(chars)} cells, expected 8")
            for c, ch in enumerate(chars):
                p = CHAR_PIECES[ch]
                if p is Piece.EMPTY:
                    continue
                if not is_dark((r, c)):
                    raise ValueError(
                        f"piece on light square at {square_to_algebraic((r, c))}"
                    )
                b.cells[r][c] = p
        b.turn = turn
        b.history.append(b.position_key())
        return b

    def to_ascii(self) -> str:
        return "\n".join(
            "".join(PIECE_CHARS[self.cells[r][c]] for c in range(BOARD_SIZE))
            for r in range(BOARD_SIZE)
        )

    # ---- accessors --------------------------------------------------------
    def get(self, sq: Square) -> Piece:
        r, c = sq
        return self.cells[r][c]

    def set(self, sq: Square, p: Piece) -> None:
        r, c = sq
        self.cells[r][c] = p

    def iter_pieces(self, color: Color | None = None) -> Iterable[tuple[Square, Piece]]:
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                p = self.cells[r][c]
                if p is Piece.EMPTY:
                    continue
                if color is not None and p.color is not color:
                    continue
                yield (r, c), p

    def count(self, color: Color) -> tuple[int, int]:
        """Return ``(men, kings)`` for the given color."""
        men = kings = 0
        for _, p in self.iter_pieces(color):
            if p.is_king:
                kings += 1
            else:
                men += 1
        return men, kings

    # ---- copy / hash ------------------------------------------------------
    def clone(self) -> "Board":
        b = Board()
        b.cells = [row[:] for row in self.cells]
        b.turn = self.turn
        b.plies_since_progress = self.plies_since_progress
        b.history = list(self.history)
        return b

    def position_key(self) -> str:
        """Stable string key (board + side to move). Used for repetition."""
        flat = "".join(PIECE_CHARS[self.cells[r][c]] for r in range(8) for c in range(8))
        return f"{flat}|{int(self.turn)}"

    # ---- serialization for the wire ---------------------------------------
    def to_dict(self) -> dict:
        return {
            "cells": [[int(self.cells[r][c]) for c in range(8)] for r in range(8)],
            "turn": int(self.turn),
            "pliesSinceProgress": self.plies_since_progress,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Board":
        b = cls()
        b.cells = [[Piece(int(d["cells"][r][c])) for c in range(8)] for r in range(8)]
        b.turn = Color(int(d.get("turn", 0)))
        b.plies_since_progress = int(d.get("pliesSinceProgress", 0))
        b.history = [b.position_key()]
        return b


START_POSITION = Board.initial()
