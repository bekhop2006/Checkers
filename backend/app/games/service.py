"""Shared game-state helpers: applying moves, end detection, clock logic.

The same logic is used from the REST routes (vs-AI), the WebSocket multiplayer
loop, and the AI Coach analyzer.
"""

from __future__ import annotations

import random
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.models import User
from ..common.elo import update_ratings
from .engine import Board, Color, Move as EngineMove, apply_move as engine_apply_move
from .engine.moves import generate_legal_moves
from .engine.rules import (
    REASON_AGREED_DRAW,
    REASON_NO_MOVES,
    REASON_NO_PIECES,
    REASON_RESIGN,
    REASON_TIMEOUT,
    game_outcome,
)
from .models import Game, Move


def make_friend_token() -> str:
    return "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))


def legal_moves_for_game(board: Board) -> list[dict]:
    """Return all legal moves for the current side, as the wire shape."""
    return [
        {
            "path": [list(s) for s in m.path],
            "captured": [list(s) for s in m.captured],
            "promoted": m.promoted,
        }
        for m in generate_legal_moves(board)
    ]


def attach_legal_moves(game: "Game") -> None:
    """Set ``game.legal_moves`` so it serializes into the response payload.

    Only computed for active games — completed games show empty hints.
    """
    if game.status != "active":
        game.legal_moves = []
        return
    board = board_from_game(game)
    game.legal_moves = legal_moves_for_game(board)


def board_from_game(game: Game) -> Board:
    if not game.position:
        return Board.initial()
    return Board.from_dict(game.position)


def color_for_user(game: Game, user_id: int | None) -> Color | None:
    if user_id is None:
        return None
    if game.white_user_id == user_id:
        return Color.WHITE
    if game.black_user_id == user_id:
        return Color.BLACK
    return None


def find_engine_move(board: Board, path_squares: list[tuple[int, int]]) -> EngineMove | None:
    target = tuple(tuple(s) for s in path_squares)
    for m in generate_legal_moves(board):
        if m.path == target:
            return m
    return None


def now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    """Coerce a possibly-naive timestamp (SQLite drops tzinfo) to UTC-aware."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@dataclass
class ApplyResult:
    move: Move
    board: Board
    finished: bool
    result: str  # "white" | "black" | "draw" | "in_progress"
    end_reason: str | None


async def apply_engine_move(
    session: AsyncSession,
    game: Game,
    board: Board,
    engine_move: EngineMove,
    *,
    side: Color,
    update_clock: bool = True,
) -> ApplyResult:
    """Apply an already-validated engine move to the game.

    Returns the persisted Move row and the new board state. The caller is
    responsible for committing the session (so several moves can be batched).
    """

    if update_clock and game.turn_started_at is not None:
        elapsed_ms = int((now_utc() - _aware(game.turn_started_at)).total_seconds() * 1000)
        if side is Color.WHITE:
            game.white_ms_left = max(0, game.white_ms_left - elapsed_ms)
        else:
            game.black_ms_left = max(0, game.black_ms_left - elapsed_ms)
        if side is Color.WHITE:
            game.white_ms_left += game.increment_seconds * 1000
        else:
            game.black_ms_left += game.increment_seconds * 1000

    new_board = engine_apply_move(board, engine_move)
    game.position = new_board.to_dict()
    game.turn_started_at = now_utc()

    ply = len(game.moves)
    persisted_move = Move(
        game_id=game.id,
        ply=ply,
        side=int(side),
        notation=engine_move.to_algebraic(),
        path=[list(s) for s in engine_move.path],
        captured=[list(s) for s in engine_move.captured],
        promoted=engine_move.promoted,
    )
    session.add(persisted_move)
    game.moves.append(persisted_move)

    outcome = game_outcome(new_board)
    finished = outcome.is_over
    result = "in_progress"
    end_reason: str | None = None
    if finished:
        if outcome.winner is None:
            result = "draw"
        elif outcome.winner is Color.WHITE:
            result = "white"
        else:
            result = "black"
        end_reason = outcome.reason

    if finished:
        await _finalize_game(session, game, result, end_reason)

    return ApplyResult(persisted_move, new_board, finished, result, end_reason)


async def end_by_timeout(session: AsyncSession, game: Game, *, flagged: Color) -> None:
    winner = "black" if flagged is Color.WHITE else "white"
    await _finalize_game(session, game, winner, REASON_TIMEOUT)


async def end_by_resign(session: AsyncSession, game: Game, *, resigner: Color) -> None:
    winner = "black" if resigner is Color.WHITE else "white"
    await _finalize_game(session, game, winner, REASON_RESIGN)


async def end_by_draw_agreement(session: AsyncSession, game: Game) -> None:
    await _finalize_game(session, game, "draw", REASON_AGREED_DRAW)


async def _finalize_game(
    session: AsyncSession, game: Game, result: str, end_reason: str | None
) -> None:
    game.status = "completed"
    game.result = result
    game.end_reason = end_reason
    game.ended_at = now_utc()

    if game.mode == "ranked" and game.white_user_id and game.black_user_id:
        white = await session.get(User, game.white_user_id)
        black = await session.get(User, game.black_user_id)
        if white and black:
            score_white = 1.0 if result == "white" else 0.5 if result == "draw" else 0.0
            game.white_rating_before = white.rating
            game.black_rating_before = black.rating
            new_white, new_black = update_ratings(white.rating, black.rating, score_white)
            white.rating = new_white
            black.rating = new_black
            game.white_rating_after = new_white
            game.black_rating_after = new_black
            _bump_stats(white, score_white)
            _bump_stats(black, 1.0 - score_white)

    elif game.mode == "friend" and game.white_user_id and game.black_user_id:
        white = await session.get(User, game.white_user_id)
        black = await session.get(User, game.black_user_id)
        if white and black:
            score_white = 1.0 if result == "white" else 0.5 if result == "draw" else 0.0
            _bump_stats(white, score_white)
            _bump_stats(black, 1.0 - score_white)


def _bump_stats(user: User, score: float) -> None:
    user.games_played += 1
    if score == 1.0:
        user.wins += 1
        user.streak = max(1, user.streak + 1) if user.streak >= 0 else 1
    elif score == 0.0:
        user.losses += 1
        user.streak = min(-1, user.streak - 1) if user.streak <= 0 else -1
    else:
        user.draws += 1


def choose_random_color() -> Color:
    return random.choice((Color.WHITE, Color.BLACK))
