"""Idempotent seed script: puzzles + (optionally) a demo user.

Run with: ``uv run python -m app.scripts.seed``.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import func, select

from ..auth.models import User
from ..auth.security import hash_password
from ..db import SessionLocal, create_all
from ..puzzles.models import Puzzle
from ..puzzles.seed_data import PUZZLES


async def _seed_puzzles() -> int:
    async with SessionLocal() as session:
        existing = (await session.execute(select(func.count(Puzzle.id)))).scalar_one() or 0
        if existing > 0:
            return 0
        for p in PUZZLES:
            session.add(Puzzle(**p))
        await session.commit()
        return len(PUZZLES)


async def _seed_demo_user() -> bool:
    async with SessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == "demo@checkers.local"))
        ).scalar_one_or_none()
        if existing:
            return False
        session.add(
            User(
                email="demo@checkers.local",
                password_hash=hash_password("demodemo"),
                display_name="Demo Player",
                city="Алматы",
            )
        )
        await session.commit()
        return True


async def main() -> None:
    await create_all()
    p = await _seed_puzzles()
    u = await _seed_demo_user()
    print(f"seeded puzzles: {p}; demo user created: {u}")


if __name__ == "__main__":
    asyncio.run(main())
