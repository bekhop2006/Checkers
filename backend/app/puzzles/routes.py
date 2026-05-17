"""Puzzles REST: daily puzzle + submit attempt."""

from __future__ import annotations

import hashlib
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_user, get_current_user_optional
from ..auth.models import User
from ..db import get_session
from ..games.engine.board import Board
from ..games.service import legal_moves_for_game
from .models import Puzzle, PuzzleAttempt

router = APIRouter(prefix="/puzzles", tags=["puzzles"])


class PuzzleOut(BaseModel):
    id: int
    theme: str
    difficulty: int
    side_to_move: int
    description: str
    position: dict
    legal_moves: list = []

    class Config:
        from_attributes = True


class PuzzleAttemptIn(BaseModel):
    puzzle_id: int
    path: list  # [[r,c], ...] -- player's full move path


class PuzzleAttemptOut(BaseModel):
    correct: bool
    streak: int
    solution: list | None = None


def _today_iso() -> str:
    return date.today().isoformat()


async def _pick_daily(session: AsyncSession) -> Puzzle | None:
    count = (await session.execute(select(func.count(Puzzle.id)))).scalar_one() or 0
    if count == 0:
        return None
    seed = int(hashlib.sha256(_today_iso().encode()).hexdigest(), 16) % count
    rows = (await session.execute(select(Puzzle).offset(seed).limit(1))).scalars().all()
    return rows[0] if rows else None


@router.get("/daily", response_model=PuzzleOut | None)
async def daily(
    user: User | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> PuzzleOut | None:
    p = await _pick_daily(session)
    if not p:
        return None
    board = Board.from_dict(p.position)
    out = PuzzleOut.model_validate(p)
    out.legal_moves = legal_moves_for_game(board)
    return out


@router.post("/attempt", response_model=PuzzleAttemptOut)
async def attempt(
    payload: PuzzleAttemptIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PuzzleAttemptOut:
    puzzle = await session.get(Puzzle, payload.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="puzzle not found")

    path_norm = [list(s) for s in payload.path]
    correct = any(path_norm == list(sol) for sol in puzzle.solution)
    today = _today_iso()

    # Record attempt.
    session.add(
        PuzzleAttempt(
            user_id=user.id,
            puzzle_id=puzzle.id,
            solved=correct,
            date_iso=today,
        )
    )

    if correct:
        if user.last_puzzle_date == today:
            pass  # already counted today
        else:
            # Increment streak if previous day == today-1, else reset to 1.
            from datetime import datetime, timedelta

            try:
                last = (
                    datetime.fromisoformat(user.last_puzzle_date).date()
                    if user.last_puzzle_date
                    else None
                )
            except Exception:
                last = None
            if last is not None and (date.today() - last) == timedelta(days=1):
                user.puzzle_streak += 1
            else:
                user.puzzle_streak = 1
            user.last_puzzle_date = today

    await session.commit()
    await session.refresh(user)
    return PuzzleAttemptOut(
        correct=correct,
        streak=user.puzzle_streak,
        solution=None if correct else puzzle.solution,
    )
