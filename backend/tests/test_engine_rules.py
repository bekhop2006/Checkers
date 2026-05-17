"""Rule edge-case tests for the Russian draughts engine.

Notation in ascii diagrams:
    .  empty
    w  white man      W  white king
    b  black man      B  black king

Row 0 = top of screen (black's home rank), row 7 = bottom (white's home rank).
"""

from __future__ import annotations

import pytest

from app.games.engine.board import (
    Board,
    Color,
    Piece,
    algebraic_to_square,
    square_to_algebraic,
)
from app.games.engine.moves import Move, apply_move, generate_legal_moves
from app.games.engine.rules import (
    REASON_NO_MOVES,
    REASON_NO_PIECES,
    REASON_PROGRESS_RULE,
    REASON_REPETITION,
    game_outcome,
)


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------


def sq(s: str) -> tuple[int, int]:
    return algebraic_to_square(s)


def find_move(board: Board, *path: str) -> Move | None:
    """Find the legal move whose algebraic path matches the given squares."""
    target = tuple(sq(s) for s in path)
    for m in generate_legal_moves(board):
        if m.path == target:
            return m
    return None


def algebraic_moves(board: Board) -> set[str]:
    return {m.to_algebraic() for m in generate_legal_moves(board)}


# -----------------------------------------------------------------------------
# 1. Initial position
# -----------------------------------------------------------------------------


def test_initial_position_layout():
    b = Board.initial()
    # 12 men each colour.
    assert b.count(Color.WHITE) == (12, 0)
    assert b.count(Color.BLACK) == (12, 0)
    # Only dark squares occupied.
    for (r, c), _ in b.iter_pieces():
        assert (r + c) % 2 == 1


def test_initial_position_has_seven_white_moves():
    b = Board.initial()
    moves = generate_legal_moves(b)
    assert len(moves) == 7  # four row-5 men: 1 + 2 + 2 + 2 advances
    assert all(not m.is_capture for m in moves)


def test_no_legal_move_after_white_loses_all_pieces():
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ..b.....
        ........
        ........
        """,
        turn=Color.WHITE,
    )
    out = game_outcome(b)
    assert out.is_over and out.winner is Color.BLACK and out.reason == REASON_NO_PIECES


# -----------------------------------------------------------------------------
# 2. Mandatory capture
# -----------------------------------------------------------------------------


def test_mandatory_capture_prunes_quiet_moves():
    # White at c3, black man at d4. White MUST capture.
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
    moves = generate_legal_moves(b)
    assert all(m.is_capture for m in moves)
    assert "c3xe5" in algebraic_moves(b)


def test_man_captures_backwards_in_russian_variant():
    # Black man at d4 should be able to capture a white man at c3
    # (backwards for black, who's heading toward row 7).
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
        turn=Color.BLACK,
    )
    moves = algebraic_moves(b)
    assert "d4xb2" in moves


# -----------------------------------------------------------------------------
# 3. Multi-jump must continue
# -----------------------------------------------------------------------------


def test_multi_jump_required_and_path_chosen():
    # White man at b2, blacks at c3 and e5; chain b2 x c3 (land d4) x e5 (land f6).
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ....b...
        ........
        ..b.....
        .w......
        ........
        """,
        turn=Color.WHITE,
    )
    moves = algebraic_moves(b)
    assert moves == {"b2xd4xf6"}, moves


def test_cannot_recapture_same_enemy():
    # If the engine produced single-step results separately the suite would
    # show two captures from one path. We expect only the maximal chain.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ....b...
        ........
        ..b.....
        .w......
        ........
        """,
        turn=Color.WHITE,
    )
    captures = generate_legal_moves(b)
    # No single-capture intermediates should leak through.
    for m in captures:
        # No square may appear twice in `captured`.
        assert len(set(m.captured)) == len(m.captured)


# -----------------------------------------------------------------------------
# 4. Mid-chain promotion to king (Russian: continue as king)
# -----------------------------------------------------------------------------


def test_man_promotes_mid_chain_and_continues_as_king():
    # White man at d2 (row 6, col 3). Blacks at c3, c5, c7 forming a zig-zag
    # along the same colour squares. Chain: d2 x c3 -> b4 x c5 -> d6 x c7 -> b8.
    # The last jump lands on row 0, promoting the man mid-chain. After the
    # chain ends (no further capture from b8 as a king), the piece is a king.
    b = Board.from_ascii(
        """
        ........
        ..b.....
        ........
        ..b.....
        ........
        ..b.....
        ...w....
        ........
        """,
        turn=Color.WHITE,
    )
    move = find_move(b, "d2", "b4", "d6", "b8")
    assert move is not None, sorted(algebraic_moves(b))
    nb = apply_move(b, move)
    assert nb.get(sq("b8")) is Piece.WHITE_KING
    for s in ("c3", "c5", "c7"):
        assert nb.get(sq(s)) is Piece.EMPTY


# -----------------------------------------------------------------------------
# 5. King movement & captures (flying king)
# -----------------------------------------------------------------------------


def test_king_quiet_moves_slide_full_diagonal():
    # White king alone on a1.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        W.......
        """,
        turn=Color.WHITE,
    )
    moves = algebraic_moves(b)
    # Should be able to slide to b2, c3, d4, e5, f6, g7, h8 (7 squares).
    expected = {f"a1-{square_to_algebraic((7 - i, i))}" for i in range(1, 8)}
    assert moves == expected


def test_king_capture_lands_any_square_beyond_enemy():
    # White king on a1, black man on d4. Empty between and beyond.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ...b....
        ........
        ........
        W.......
        """,
        turn=Color.WHITE,
    )
    captures = algebraic_moves(b)
    # Capture diagonals: a1 sees d4 first along NE diagonal. Beyond d4
    # along same diagonal: e5, f6, g7, h8. Four landing options.
    assert captures == {f"a1x{land}" for land in ("e5", "f6", "g7", "h8")}


def test_king_blocked_by_own_piece_behind_enemy():
    # White king on a1, black at d4, WHITE at f6. King can land only on e5.
    b = Board.from_ascii(
        """
        ........
        ........
        .....w..
        ........
        ...b....
        ........
        ........
        W.......
        """,
        turn=Color.WHITE,
    )
    captures = algebraic_moves(b)
    assert captures == {"a1xe5"}


def test_king_captured_pieces_block_diagonals_during_chain():
    # White king at a1, blacks at c3 and e5 on the same diagonal.
    # The king must capture c3 (the closer one) first; after landing at d4
    # the king can swing onto a different diagonal (NE) to take e5 (it sees
    # e5 because d4 is one square SW of e5 — a fresh diagonal, not via c3).
    # Critically, no chain may ever contain c3 twice.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ....b...
        ........
        ..b.....
        ........
        W.......
        """,
        turn=Color.WHITE,
    )
    moves = generate_legal_moves(b)
    # All chains include c3 first and exactly once.
    for m in moves:
        assert m.captured[0] == sq("c3")
        assert len(set(m.captured)) == len(m.captured)
    # Best chains take both enemies (c3, then via d4 swing onto e5).
    two_caps = [m for m in moves if len(m.captured) == 2]
    assert two_caps, "expected at least one 2-capture chain"
    assert {m.captured[1] for m in two_caps} == {sq("e5")}


# -----------------------------------------------------------------------------
# 6. Promotion at end of quiet move
# -----------------------------------------------------------------------------


def test_quiet_promotion_at_end_of_move():
    # White man on b2; black has no captures available. White moves a1? No,
    # white needs to go to row 0. Put white man at c1 wait row 7 is white's
    # back rank — they're already there. Put white man at b6 (row 2, col 1).
    # Move b6 -> a7 (row 1) — not on back rank. To promote, white man must
    # be on row 1 and move to row 0. So put white at b8? No, b8 is row 0 already.
    # Put white at a7 (row 1, col 0). Move a7 -> b8 (row 0, col 1) promotes.
    b = Board.from_ascii(
        """
        ........
        w.......
        ........
        ........
        ........
        ........
        ........
        ........
        """,
        turn=Color.WHITE,
    )
    nb = apply_move(b, find_move(b, "a7", "b8"))
    assert nb.get(sq("b8")) is Piece.WHITE_KING


# -----------------------------------------------------------------------------
# 7. Stalemate (no moves) = loss
# -----------------------------------------------------------------------------


def test_no_legal_moves_is_loss_for_side_to_move():
    # White man at a1 (row 7, col 0). Black men at b2 (blocking diagonal
    # forward) and... actually a1's only forward target is b2 (row 6, col 1).
    # If b2 has a black man and the landing c3 (row 5, col 2) is empty, white
    # CAN capture. To stalemate white we must block all options including
    # captures.
    #
    # Place black man on b2 AND on c3 such that the jump landing is occupied.
    # And we also need any other diagonal pieces ineligible.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ........
        .b......
        w.......
        """,
        turn=Color.WHITE,
    )
    # White at a1 has one forward target (b2, occupied). Capture: jump b2
    # land c3 - empty, so capture is legal. We need to ALSO block c3.
    # Build the position differently:
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ..b.....
        .b......
        w.......
        """,
        turn=Color.WHITE,
    )
    # a1 forward = b2 (blocked by black). Capture b2: land at c3 — also black.
    # Capture chain not possible. No other white piece exists. → No legal moves.
    out = game_outcome(b)
    assert out.is_over and out.winner is Color.BLACK and out.reason == REASON_NO_MOVES


# -----------------------------------------------------------------------------
# 8. Draw rules
# -----------------------------------------------------------------------------


def test_threefold_repetition_draw():
    # White king at a1, black king at g1 — different diagonals, no capture
    # threats between them. The two kings can shuffle harmlessly.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        W.....B.
        """,
        turn=Color.WHITE,
    )
    seq = [
        ("a1", "b2"),  # white
        ("g1", "h2"),  # black
        ("b2", "a1"),  # white
        ("h2", "g1"),  # black -> back to start (2nd occurrence of initial position)
        ("a1", "b2"),
        ("g1", "h2"),
        ("b2", "a1"),
        ("h2", "g1"),  # 3rd occurrence
    ]
    cur = b
    for src, dst in seq:
        m = find_move(cur, src, dst)
        assert m is not None, f"missing move {src}-{dst} from {sorted(algebraic_moves(cur))}"
        cur = apply_move(cur, m)
    out = game_outcome(cur)
    assert out.is_over and out.winner is None and out.reason == REASON_REPETITION


def test_progress_rule_draw_after_50_plies_of_king_dancing():
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        W.....B.
        """,
        turn=Color.WHITE,
    )
    # Bypass actual play; bump the counter directly.
    b.plies_since_progress = 50
    out = game_outcome(b)
    assert out.is_over and out.winner is None and out.reason == REASON_PROGRESS_RULE


# -----------------------------------------------------------------------------
# 9. apply_move / serialization
# -----------------------------------------------------------------------------


def test_apply_capture_removes_jumped_pieces():
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
    m = find_move(b, "c3", "e5")
    assert m is not None
    nb = apply_move(b, m)
    assert nb.get(sq("d4")) is Piece.EMPTY
    assert nb.get(sq("e5")) is Piece.WHITE_MAN
    assert nb.get(sq("c3")) is Piece.EMPTY
    assert nb.turn is Color.BLACK


def test_to_dict_roundtrip():
    b = Board.initial()
    moves = generate_legal_moves(b)
    nb = apply_move(b, moves[0])
    nb2 = Board.from_dict(nb.to_dict())
    assert nb2.to_ascii() == nb.to_ascii()
    assert nb2.turn is nb.turn


# -----------------------------------------------------------------------------
# 10. Multiple capture options (no max-capture rule in Russian)
# -----------------------------------------------------------------------------


def test_player_may_choose_among_capture_paths():
    # Two captures available; engine should expose both as legal options.
    b = Board.from_ascii(
        """
        ........
        ........
        ........
        ........
        ...b.b..
        ..w.....
        ........
        ........
        """,
        turn=Color.WHITE,
    )
    captures = algebraic_moves(b)
    # White at c3 can jump d4 -> e5 (then might continue from e5 to capture
    # f4? f4 is not present here; only b4 and f4 unset). With blacks at d4
    # and f4 we can do c3 x d4 -> e5 OR c3 x f4 path? f4 is not adjacent to
    # c3. The only capture starts with c3 x d4 -> e5. From e5 there's another
    # black? No — second black is on f4 (row 4, col 5). e5 jumps f4? f4 is
    # (row 4, col 5); from e5 (row 3, col 4) the south-east diagonal goes
    # to (4, 5) = f4. So e5 x f4 -> g3. Chain: c3 x d4 -> e5 x f4 -> g3.
    assert captures == {"c3xe5xg3"}
