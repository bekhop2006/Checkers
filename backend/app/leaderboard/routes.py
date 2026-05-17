"""Leaderboard endpoints: global / per-city / weekly slices."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.models import User
from ..db import get_session
from ..games.models import Game
from .cities import DEFAULT_CITIES

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    display_name: str
    city: str | None
    rating: int
    games_played: int
    wins: int
    is_pro: bool


@router.get("/cities")
async def cities() -> dict:
    return {"cities": DEFAULT_CITIES}


@router.get("/global", response_model=list[LeaderboardEntry])
async def global_board(
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    rows = (
        await session.execute(
            select(User).order_by(desc(User.rating), User.id).limit(limit)
        )
    ).scalars().all()
    return _to_entries(rows)


@router.get("/city", response_model=list[LeaderboardEntry])
async def city_board(
    city: str,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    rows = (
        await session.execute(
            select(User)
            .where(User.city == city)
            .order_by(desc(User.rating), User.id)
            .limit(limit)
        )
    ).scalars().all()
    return _to_entries(rows)


@router.get("/weekly", response_model=list[LeaderboardEntry])
async def weekly_board(
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    """Top users by ranked wins in the past 7 days."""
    since = datetime.now(tz=timezone.utc) - timedelta(days=7)
    sub = (
        select(
            User.id.label("user_id"),
            func.count(Game.id).label("recent_wins"),
        )
        .select_from(User)
        .join(
            Game,
            or_(
                (Game.white_user_id == User.id) & (Game.result == "white"),
                (Game.black_user_id == User.id) & (Game.result == "black"),
            ),
        )
        .where(Game.mode == "ranked", Game.ended_at >= since)
        .group_by(User.id)
        .subquery()
    )

    rows = (
        await session.execute(
            select(User)
            .join(sub, sub.c.user_id == User.id)
            .order_by(desc(sub.c.recent_wins), desc(User.rating))
            .limit(limit)
        )
    ).scalars().all()
    return _to_entries(rows)


def _to_entries(users: list[User]) -> list[LeaderboardEntry]:
    return [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            display_name=u.display_name,
            city=u.city,
            rating=u.rating,
            games_played=u.games_played,
            wins=u.wins,
            is_pro=u.is_pro,
        )
        for i, u in enumerate(users)
    ]
