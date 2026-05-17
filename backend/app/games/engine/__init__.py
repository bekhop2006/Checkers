"""Pure-Python Russian draughts (8x8) engine.

Zero FastAPI / DB imports — usable from REST routes, WebSocket handlers,
the AI Coach analyzer, and unit tests alike.
"""

from .board import Board, Color, Piece, Square, START_POSITION
from .moves import Move, generate_legal_moves, apply_move
from .rules import GameOutcome, game_outcome
from .search import best_move, evaluate_position

__all__ = [
    "Board",
    "Color",
    "Piece",
    "Square",
    "START_POSITION",
    "Move",
    "generate_legal_moves",
    "apply_move",
    "GameOutcome",
    "game_outcome",
    "best_move",
    "evaluate_position",
]
