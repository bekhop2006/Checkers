"""REST endpoints for game creation, move submission (vs-AI), history."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.deps import get_current_user, get_current_user_optional
from ..auth.models import User
from ..auth.security import (
    hash_password,
    make_access_token,
    make_refresh_token,
)
from ..config import get_settings
from ..db import get_session
from .engine import Color
from .engine.search import best_move as engine_best_move
from .manager import manager
from .models import Game
from .schemas import (
    CreateFriendIn,
    CreateRankedIn,
    CreateVsAiIn,
    GameDetailOut,
    GameSummaryOut,
)
from .service import (
    apply_engine_move,
    attach_legal_moves,
    board_from_game,
    choose_random_color,
    color_for_user,
    find_engine_move,
    make_friend_token,
    now_utc,
)

router = APIRouter(prefix="/games", tags=["games"])
GUEST_EMAIL_DOMAIN = "guest.checkers-play.app"


async def _load_game(session: AsyncSession, game_id: int) -> Game:
    result = await session.execute(
        select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="game not found")
    attach_legal_moves(game)
    return game


def _new_game_defaults(initial_seconds: int, increment_seconds: int) -> dict:
    from .engine.board import Board

    pos = Board.initial().to_dict()
    return {
        "initial_seconds": initial_seconds,
        "increment_seconds": increment_seconds,
        "white_ms_left": initial_seconds * 1000,
        "black_ms_left": initial_seconds * 1000,
        "position": pos,
        "status": "active",
        "result": "in_progress",
    }


def _set_auth_cookies(response: Response, user_id: int) -> None:
    settings = get_settings()
    access = make_access_token(user_id)
    refresh = make_refresh_token(user_id)
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_ttl_minutes * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_ttl_days * 86400,
        path="/api/auth",
    )


async def _create_guest_user(session: AsyncSession) -> User:
    """Create a guest user with a syntactically valid non-reserved email."""
    for _ in range(8):
        suffix = secrets.token_hex(4)
        email = f"guest-{suffix}@{GUEST_EMAIL_DOMAIN}"
        exists = (
            await session.execute(select(User.id).where(User.email == email))
        ).scalar_one_or_none()
        if exists is not None:
            continue
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            display_name=f"Guest-{suffix}",
            city=None,
        )
        session.add(user)
        await session.flush()
        return user
    raise HTTPException(status_code=500, detail="failed to provision guest user")


async def _is_guest_account(session: AsyncSession, user_id: int | None) -> bool:
    if not user_id:
        return False
    u = await session.get(User, user_id)
    if not u:
        return False
    return u.email.endswith(f"@{GUEST_EMAIL_DOMAIN}") and u.email.startswith("guest-")


# ---- create -----------------------------------------------------------------


@router.post("/vs-ai", response_model=GameDetailOut)
async def create_vs_ai(
    payload: CreateVsAiIn,
    background: BackgroundTasks,
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> Game:
    if payload.difficulty == "expert" and (not user or not user.is_pro):
        raise HTTPException(status_code=402, detail="expert difficulty requires Pro")

    if payload.player_color == "random":
        player_color = choose_random_color()
    else:
        player_color = Color.WHITE if payload.player_color == "white" else Color.BLACK

    defaults = _new_game_defaults(
        payload.time_control.initial_seconds, payload.time_control.increment_seconds
    )
    game = Game(
        mode="vs_ai",
        ai_difficulty=payload.difficulty,
        white_user_id=user.id if user and player_color is Color.WHITE else None,
        black_user_id=user.id if user and player_color is Color.BLACK else None,
        turn_started_at=now_utc(),
        **defaults,
    )
    session.add(game)
    await session.commit()
    await session.refresh(game)

    # If AI plays white, fire the first AI move immediately.
    if player_color is Color.BLACK:
        await _ai_move(session, game, payload.difficulty)
        await session.commit()

    # Always re-load with eager `.moves` so the response serializer doesn't
    # trigger lazy loading on the async session.
    return await _load_game(session, game.id)


@router.post("/friend", response_model=GameDetailOut)
async def create_friend_game(
    payload: CreateFriendIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Game:
    defaults = _new_game_defaults(
        payload.time_control.initial_seconds, payload.time_control.increment_seconds
    )
    game = Game(
        mode="friend",
        white_user_id=user.id,
        friend_token=make_friend_token(),
        turn_started_at=now_utc(),
        **defaults,
    )
    session.add(game)
    await session.commit()
    return await _load_game(session, game.id)


@router.post("/ranked", response_model=GameDetailOut)
async def create_ranked_game(
    payload: CreateRankedIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Game:
    defaults = _new_game_defaults(
        payload.time_control.initial_seconds, payload.time_control.increment_seconds
    )
    game = Game(
        mode="ranked",
        white_user_id=user.id,
        friend_token=make_friend_token(),
        turn_started_at=now_utc(),
        **defaults,
    )
    session.add(game)
    await session.commit()
    return await _load_game(session, game.id)


@router.post("/join/{token}", response_model=GameDetailOut)
async def join_friend_game(
    token: str,
    response: Response,
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> Game:
    game = (
        await session.execute(
            select(Game)
            .options(selectinload(Game.moves))
            .where(Game.friend_token == token, Game.status == "active")
        )
    ).scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="invitation expired or not found")
    if user is None:
        # Friend link supports "play without registration": provision an
        # ephemeral account and set auth cookies for websocket gameplay.
        if game.mode == "ranked":
            raise HTTPException(status_code=401, detail="login required for ranked")
        user = await _create_guest_user(session)
        _set_auth_cookies(response, user.id)
    if game.white_user_id == user.id or game.black_user_id == user.id:
        return await _load_game(session, game.id)
    if game.black_user_id is None:
        game.black_user_id = user.id
    elif game.white_user_id is None:
        game.white_user_id = user.id
    else:
        # If the room is full only because an ephemeral guest seat exists,
        # allow a real authenticated user to take that seat in friend mode.
        if game.mode != "friend":
            raise HTTPException(status_code=409, detail="room is full")

        white_is_guest = await _is_guest_account(session, game.white_user_id)
        black_is_guest = await _is_guest_account(session, game.black_user_id)

        if white_is_guest and game.white_user_id and not manager.is_user_connected(game.id, game.white_user_id):
            game.white_user_id = user.id
        elif black_is_guest and game.black_user_id and not manager.is_user_connected(game.id, game.black_user_id):
            game.black_user_id = user.id
        else:
            raise HTTPException(status_code=409, detail="room is full")
    await session.commit()
    return await _load_game(session, game.id)


# ---- moves (vs-AI only; multiplayer flows through WS) ----------------------


@router.post("/{game_id}/move", response_model=GameDetailOut)
async def submit_move(
    game_id: int,
    payload: dict,
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> Game:
    """Submit a move in a vs-AI game.

    ``payload`` shape: ``{ "path": [[r,c], [r,c], ...] }``.
    """

    game = await _load_game(session, game_id)
    if game.mode != "vs_ai":
        raise HTTPException(status_code=400, detail="use the websocket for this mode")
    if game.status != "active":
        raise HTTPException(status_code=400, detail="game already finished")

    board = board_from_game(game)
    player_side = color_for_user(game, user.id if user else None)
    if player_side is None:
        # Guest playing as the side that owns no user_id.
        player_side = Color.WHITE if game.white_user_id is None else Color.BLACK
    if board.turn is not player_side:
        raise HTTPException(status_code=400, detail="not your turn")

    path = payload.get("path") or []
    eng_move = find_engine_move(board, path)
    if eng_move is None:
        raise HTTPException(status_code=400, detail="illegal move")

    result = await apply_engine_move(session, game, board, eng_move, side=player_side)
    await session.commit()

    if not result.finished:
        await _ai_move(session, game, game.ai_difficulty or "medium")
        await session.commit()

    return await _load_game(session, game_id)


async def _ai_move(session: AsyncSession, game: Game, difficulty: str) -> None:
    board = board_from_game(game)
    if game.status != "active":
        return
    ai_side = board.turn
    sr = engine_best_move(board, difficulty=difficulty)
    if sr.move is None:
        return
    await apply_engine_move(session, game, board, sr.move, side=ai_side)


# ---- read ------------------------------------------------------------------


@router.get("/{game_id}", response_model=GameDetailOut)
async def get_game(
    game_id: int,
    session: AsyncSession = Depends(get_session),
) -> Game:
    return await _load_game(session, game_id)


@router.get("/me/history", response_model=list[GameSummaryOut])
async def my_history(
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Game]:
    rows = (
        (
            await session.execute(
                select(Game)
                .where(or_(Game.white_user_id == user.id, Game.black_user_id == user.id))
                .order_by(desc(Game.created_at))
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows)
