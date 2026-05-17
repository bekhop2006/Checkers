"""Coach REST endpoints (kick analysis, fetch result)."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..auth.deps import get_current_user
from ..auth.models import User
from ..db import get_session
from ..games.models import Game
from ..games.schemas import GameDetailOut
from .analyzer import schedule_analysis

router = APIRouter(prefix="/coach", tags=["coach"])


@router.post("/games/{game_id}/analyze", response_model=GameDetailOut)
async def analyze_game(
    game_id: int,
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    game = (
        await session.execute(
            select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
        )
    ).scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="game not found")
    if game.status != "completed":
        raise HTTPException(status_code=400, detail="game still in progress")

    if game.coach_status not in ("ready", "running"):
        background.add_task(schedule_analysis, game_id)
        game.coach_status = "running"
        await session.commit()

    return game
