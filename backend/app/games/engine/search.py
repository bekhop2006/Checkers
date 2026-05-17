"""Iterative-deepening alpha-beta search for Russian draughts.

The engine is intentionally simple: pure Python, no native extensions.
Speed comes from move ordering (captures first), a transposition table
keyed by Zobrist hash, and time-bounded iterative deepening.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from .board import Board, Color
from .eval import evaluate_position
from .moves import Move, apply_move, generate_legal_moves
from .rules import REASON_NO_MOVES, REASON_NO_PIECES, game_outcome
from .zobrist import zobrist_hash

WIN_SCORE = 1_000_000


@dataclass
class SearchResult:
    move: Move | None
    score: int
    depth: int
    nodes: int
    elapsed_ms: int


DIFFICULTY = {
    "easy": (2, 0.4),
    "medium": (4, 1.0),
    "hard": (6, 2.5),
    "expert": (8, 5.0),  # Pro-only on the frontend
}


def best_move(board: Board, difficulty: str = "medium") -> SearchResult:
    """Search for the best move at the given difficulty.

    Returns the move and the engine's evaluation (from the side-to-move
    perspective in centipawns).
    """

    max_depth, time_budget = DIFFICULTY.get(difficulty, DIFFICULTY["medium"])
    deadline = time.monotonic() + time_budget

    tt: dict[int, tuple[int, int, Move | None]] = {}  # zhash -> (depth, score, best)
    nodes = 0

    def order_moves(b: Board, moves: list[Move], tt_best: Move | None) -> list[Move]:
        def key(m: Move) -> tuple[int, int]:
            cap_score = -len(m.captured)
            promo_score = -1 if m.promoted else 0
            return (cap_score, promo_score)

        ordered = sorted(moves, key=key)
        if tt_best and tt_best in ordered:
            ordered.remove(tt_best)
            ordered.insert(0, tt_best)
        return ordered

    def search(b: Board, depth: int, ply: int, alpha: int, beta: int) -> int:
        nonlocal nodes
        nodes += 1
        if time.monotonic() > deadline and ply > 0:
            raise TimeoutError

        out = game_outcome(b)
        if out.is_over:
            if out.winner is None:
                return 0
            if out.winner is b.turn:
                return WIN_SCORE - ply
            return -WIN_SCORE + ply

        if depth == 0:
            return evaluate_position(b)

        zh = zobrist_hash(b)
        tt_entry = tt.get(zh)
        tt_best = tt_entry[2] if tt_entry else None
        if tt_entry and tt_entry[0] >= depth:
            return tt_entry[1]

        moves = generate_legal_moves(b)
        if not moves:
            return -WIN_SCORE + ply

        moves = order_moves(b, moves, tt_best)
        best_score = -WIN_SCORE - 1
        best: Move | None = None
        for m in moves:
            child = apply_move(b, m)
            score = -search(child, depth - 1, ply + 1, -beta, -alpha)
            if score > best_score:
                best_score = score
                best = m
            if score > alpha:
                alpha = score
            if alpha >= beta:
                break  # beta cutoff

        tt[zh] = (depth, best_score, best)
        return best_score

    start = time.monotonic()
    best_move_found: Move | None = None
    best_score = 0
    completed_depth = 0

    for d in range(1, max_depth + 1):
        try:
            score = search(board, d, 0, -WIN_SCORE - 1, WIN_SCORE + 1)
            zh = zobrist_hash(board)
            entry = tt.get(zh)
            if entry and entry[2] is not None:
                best_move_found = entry[2]
                best_score = score
                completed_depth = d
        except TimeoutError:
            break
        if time.monotonic() > deadline:
            break

    if best_move_found is None:
        legal = generate_legal_moves(board)
        best_move_found = legal[0] if legal else None
        best_score = 0

    elapsed_ms = int((time.monotonic() - start) * 1000)
    return SearchResult(
        move=best_move_found,
        score=best_score,
        depth=completed_depth,
        nodes=nodes,
        elapsed_ms=elapsed_ms,
    )


def evaluate_with_search(board: Board, depth: int = 4, time_budget: float = 0.5) -> int:
    """Run a quick search and return the score (cp, side-to-move POV)."""
    deadline = time.monotonic() + time_budget
    tt: dict[int, tuple[int, int, Move | None]] = {}

    def search(b: Board, d: int, ply: int, alpha: int, beta: int) -> int:
        if time.monotonic() > deadline and ply > 0:
            raise TimeoutError
        out = game_outcome(b)
        if out.is_over:
            if out.winner is None:
                return 0
            if out.winner is b.turn:
                return WIN_SCORE - ply
            return -WIN_SCORE + ply
        if d == 0:
            return evaluate_position(b)
        moves = generate_legal_moves(b)
        if not moves:
            return -WIN_SCORE + ply
        moves.sort(key=lambda m: -len(m.captured))
        best = -WIN_SCORE - 1
        for m in moves:
            score = -search(apply_move(b, m), d - 1, ply + 1, -beta, -alpha)
            if score > best:
                best = score
            if score > alpha:
                alpha = score
            if alpha >= beta:
                break
        return best

    final_score = evaluate_position(board)
    for d in range(1, depth + 1):
        try:
            final_score = search(board, d, 0, -WIN_SCORE - 1, WIN_SCORE + 1)
        except TimeoutError:
            break
        if time.monotonic() > deadline:
            break
    return final_score
