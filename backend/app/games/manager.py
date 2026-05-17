"""In-process WebSocket connection manager + per-game clock task.

A single-process app is fine for MVP; if we ever scale to multiple workers
we'll switch to Redis pub/sub (out of scope here).
"""

from __future__ import annotations

import asyncio
import contextlib
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket


@dataclass(eq=False, slots=True)
class Connection:
    ws: WebSocket
    user_id: int


@dataclass
class Room:
    game_id: int
    connections: set[Connection] = field(default_factory=set)
    clock_task: asyncio.Task | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[int, Room] = {}
        self._lock = asyncio.Lock()

    def get_room(self, game_id: int) -> Room | None:
        return self._rooms.get(game_id)

    async def connect(self, game_id: int, ws: WebSocket, user_id: int) -> Connection:
        await ws.accept()
        async with self._lock:
            room = self._rooms.setdefault(game_id, Room(game_id=game_id))
            conn = Connection(ws=ws, user_id=user_id)
            room.connections.add(conn)
        return conn

    async def disconnect(self, game_id: int, conn: Connection) -> bool:
        """Remove a connection. Return True if the room is now empty."""
        async with self._lock:
            room = self._rooms.get(game_id)
            if not room:
                return True
            room.connections.discard(conn)
            empty = not room.connections
            if empty:
                if room.clock_task and not room.clock_task.done():
                    room.clock_task.cancel()
                self._rooms.pop(game_id, None)
            return empty

    async def broadcast(self, game_id: int, message: dict[str, Any]) -> None:
        room = self._rooms.get(game_id)
        if not room:
            return
        dead: list[Connection] = []
        for conn in list(room.connections):
            try:
                await conn.ws.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            await self.disconnect(game_id, d)

    def is_user_connected(self, game_id: int, user_id: int) -> bool:
        room = self._rooms.get(game_id)
        if not room:
            return False
        return any(c.user_id == user_id for c in room.connections)

    def attach_clock_task(self, game_id: int, task: asyncio.Task) -> None:
        room = self._rooms.get(game_id)
        if room and (room.clock_task is None or room.clock_task.done()):
            room.clock_task = task


manager = ConnectionManager()


async def safe_close(ws: WebSocket, code: int = 1000) -> None:
    with contextlib.suppress(Exception):
        await ws.close(code=code)
