"""WebSocket endpoint for realtime multiplayer.

Protocol (JSON over the websocket):

  Client → Server
    { "type": "hello" }                          # request current state
    { "type": "move", "path": [[r,c], ...] }     # propose a move
    { "type": "resign" }
    { "type": "draw_offer" }
    { "type": "draw_response", "accept": bool }
    { "type": "chat", "text": "..." }            # disabled in kids/ranked modes

  Server → Client
    { "type": "state", ... }                     # full game snapshot
    { "type": "move", ... }                      # one move event
    { "type": "ended", "result": "...", "reason": "..." }
    { "type": "chat", "from": user_id, "text": "..." }
    { "type": "error", "code": "...", "message": "..." }
    { "type": "tick", "white_ms_left": N, "black_ms_left": N }
"""

from __future__ import annotations

import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.models import User
from ..auth.security import decode_token
from ..coach.analyzer import schedule_analysis
from ..db import SessionLocal
from .engine import Color
from .manager import manager, safe_close
from .models import Game
from .schemas import GameDetailOut
from .service import (
    _aware,
    apply_engine_move,
    attach_legal_moves,
    board_from_game,
    color_for_user,
    end_by_draw_agreement,
    end_by_resign,
    end_by_timeout,
    find_engine_move,
    now_utc,
)

router = APIRouter()


def _game_state_payload(game: Game) -> dict:
    attach_legal_moves(game)
    detail = GameDetailOut.model_validate(game)
    return {"type": "state", **detail.model_dump(mode="json")}


async def _load_game(session: AsyncSession, game_id: int) -> Game | None:
    return (
        await session.execute(
            select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
        )
    ).scalar_one_or_none()


async def _broadcast_state(game_id: int) -> None:
    async with SessionLocal() as session:
        game = await _load_game(session, game_id)
        if not game:
            return
        await manager.broadcast(game_id, _game_state_payload(game))


async def _clock_loop(game_id: int) -> None:
    """Watch the active side's clock; end the game when time runs out.

    Also broadcasts a ``tick`` every 1s with the current remaining millis.
    """
    try:
        while True:
            await asyncio.sleep(1.0)
            async with SessionLocal() as session:
                game = await _load_game(session, game_id)
                if not game or game.status != "active":
                    return
                from .engine.board import Board

                board = Board.from_dict(game.position)
                if game.turn_started_at is None:
                    continue
                elapsed_ms = int((now_utc() - _aware(game.turn_started_at)).total_seconds() * 1000)
                if board.turn is Color.WHITE:
                    remaining = game.white_ms_left - elapsed_ms
                    if remaining <= 0:
                        await end_by_timeout(session, game, flagged=Color.WHITE)
                        await session.commit()
                        await _broadcast_state(game_id)
                        return
                    await manager.broadcast(
                        game_id,
                        {
                            "type": "tick",
                            "white_ms_left": max(0, remaining),
                            "black_ms_left": game.black_ms_left,
                        },
                    )
                else:
                    remaining = game.black_ms_left - elapsed_ms
                    if remaining <= 0:
                        await end_by_timeout(session, game, flagged=Color.BLACK)
                        await session.commit()
                        await _broadcast_state(game_id)
                        return
                    await manager.broadcast(
                        game_id,
                        {
                            "type": "tick",
                            "white_ms_left": game.white_ms_left,
                            "black_ms_left": max(0, remaining),
                        },
                    )
    except asyncio.CancelledError:  # graceful shutdown
        pass


@router.websocket("/ws/game/{game_id}")
async def game_socket(websocket: WebSocket, game_id: int, t: str | None = None) -> None:
    if not t:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(t, expected_scope="ws")
    except ValueError:
        await websocket.close(code=4401)
        return
    if int(payload.get("game_id", -1)) != game_id:
        await websocket.close(code=4403)
        return
    user_id = int(payload["sub"])

    conn = await manager.connect(game_id, websocket, user_id)
    if manager.get_room(game_id) and (
        manager.get_room(game_id).clock_task is None
        or manager.get_room(game_id).clock_task.done()
    ):
        task = asyncio.create_task(_clock_loop(game_id))
        manager.attach_clock_task(game_id, task)

    try:
        async with SessionLocal() as session:
            game = await _load_game(session, game_id)
            if not game:
                await websocket.send_json({"type": "error", "code": "not_found"})
                await safe_close(websocket, 4404)
                return
            user = await session.get(User, user_id)
            if not user:
                await safe_close(websocket, 4401)
                return
            await websocket.send_json(_game_state_payload(game))

        while True:
            data = await websocket.receive_json()
            mtype = data.get("type")

            if mtype == "hello":
                await _broadcast_state(game_id)
                continue

            if mtype == "chat":
                text = (data.get("text") or "").strip()[:280]
                if text:
                    async with SessionLocal() as session:
                        game = await _load_game(session, game_id)
                        if not game or game.status != "active":
                            continue
                        chat_disabled = game.mode == "ranked"
                        if not chat_disabled:
                            for uid in (game.white_user_id, game.black_user_id):
                                if uid is None:
                                    continue
                                u = await session.get(User, uid)
                                if u and u.kids_mode:
                                    chat_disabled = True
                                    break
                        if chat_disabled:
                            await websocket.send_json(
                                {"type": "error", "code": "chat_disabled"}
                            )
                            continue
                    await manager.broadcast(
                        game_id, {"type": "chat", "from": user_id, "text": text}
                    )
                continue

            if mtype == "resign":
                async with SessionLocal() as session:
                    game = await _load_game(session, game_id)
                    if not game or game.status != "active":
                        continue
                    side = color_for_user(game, user_id)
                    if side is None:
                        continue
                    await end_by_resign(session, game, resigner=side)
                    await session.commit()
                await _broadcast_state(game_id)
                _kick_coach_analysis(game_id)
                continue

            if mtype == "draw_response" and data.get("accept"):
                async with SessionLocal() as session:
                    game = await _load_game(session, game_id)
                    if not game or game.status != "active":
                        continue
                    await end_by_draw_agreement(session, game)
                    await session.commit()
                await _broadcast_state(game_id)
                _kick_coach_analysis(game_id)
                continue

            if mtype == "draw_offer":
                await manager.broadcast(
                    game_id, {"type": "draw_offer", "from": user_id}
                )
                continue

            if mtype == "move":
                path = data.get("path") or []
                async with SessionLocal() as session:
                    game = await _load_game(session, game_id)
                    if not game or game.status != "active":
                        await websocket.send_json(
                            {"type": "error", "code": "inactive_game"}
                        )
                        continue
                    side = color_for_user(game, user_id)
                    if side is None:
                        await websocket.send_json(
                            {"type": "error", "code": "not_seated"}
                        )
                        continue
                    board = board_from_game(game)
                    if board.turn is not side:
                        await websocket.send_json(
                            {"type": "error", "code": "not_your_turn"}
                        )
                        continue
                    eng_move = find_engine_move(board, path)
                    if eng_move is None:
                        await websocket.send_json(
                            {"type": "error", "code": "illegal_move"}
                        )
                        continue
                    apply_result = await apply_engine_move(
                        session, game, board, eng_move, side=side
                    )
                    await session.commit()

                await _broadcast_state(game_id)
                if apply_result.finished:
                    _kick_coach_analysis(game_id)
                continue

            await websocket.send_json({"type": "error", "code": "unknown_type"})

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(game_id, conn)


def _kick_coach_analysis(game_id: int) -> None:
    """Fire-and-forget background coach analysis."""
    asyncio.create_task(_run_coach(game_id))


async def _run_coach(game_id: int) -> None:
    with contextlib.suppress(Exception):
        await schedule_analysis(game_id)
        await _broadcast_state(game_id)
