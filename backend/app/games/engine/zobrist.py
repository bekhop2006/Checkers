"""Zobrist hashing — fast position keys for the transposition table."""

from __future__ import annotations

import random

from .board import BOARD_SIZE, Board, Color, Piece

_RNG = random.Random(0xC0FFEE)
_PIECE_KEYS: dict[tuple[Piece, int, int], int] = {
    (p, r, c): _RNG.getrandbits(64)
    for p in (Piece.WHITE_MAN, Piece.WHITE_KING, Piece.BLACK_MAN, Piece.BLACK_KING)
    for r in range(BOARD_SIZE)
    for c in range(BOARD_SIZE)
}
_TURN_KEY = _RNG.getrandbits(64)


def zobrist_hash(board: Board) -> int:
    h = 0
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            p = board.cells[r][c]
            if p is Piece.EMPTY:
                continue
            h ^= _PIECE_KEYS[(p, r, c)]
    if board.turn is Color.BLACK:
        h ^= _TURN_KEY
    return h
