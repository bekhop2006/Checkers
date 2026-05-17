"""Smoke tests for the search/eval modules."""

from __future__ import annotations

from app.games.engine.board import Board, Color
from app.games.engine.moves import apply_move, generate_legal_moves
from app.games.engine.search import best_move, evaluate_with_search


def test_best_move_from_initial_returns_legal_move():
    b = Board.initial()
    r = best_move(b, difficulty="easy")
    assert r.move is not None
    legal = generate_legal_moves(b)
    assert r.move in legal


def test_best_move_takes_a_free_capture():
    # White must capture the lone black man (mandatory) — search should
    # produce a capture move and a positive score.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ...b....
        ..w.....
        ........
        ........
        """,
        turn=Color.WHITE,
    )
    r = best_move(b, difficulty="easy")
    assert r.move is not None and r.move.is_capture
    assert r.score > 0


def test_evaluate_with_search_returns_int():
    b = Board.initial()
    score = evaluate_with_search(b, depth=3, time_budget=0.3)
    assert isinstance(score, int)


def test_search_completes_under_time_budget():
    # Even from a complex midgame the search must respect the time budget.
    b = Board.initial()
    # Play 6 plies of opening so position is non-trivial.
    cur = b
    for _ in range(6):
        moves = generate_legal_moves(cur)
        cur = apply_move(cur, moves[0])
    r = best_move(cur, difficulty="medium")
    assert r.move is not None
    assert r.elapsed_ms < 4000  # generous: 1s budget + warmup
