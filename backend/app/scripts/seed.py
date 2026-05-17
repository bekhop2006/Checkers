"""Idempotent seed script: puzzles + demo users.

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

DEMO_USERS = [
    ("demo1@checkers.local", "Demo Player 1", "Алматы"),
    ("demo2@checkers.local", "Demo Player 2", "Астана"),
    ("demo3@checkers.local", "Demo Player 3", "Шымкент"),
    ("demo4@checkers.local", "Demo Player 4", "Караганда"),
    ("demo5@checkers.local", "Demo Player 5", "Павлодар"),
]


async def _seed_puzzles() -> tuple[int, int]:
    async with SessionLocal() as session:
        existing_themes = {
            row[0] for row in (await session.execute(select(Puzzle.theme))).all()
        }
        inserted = 0
        for p in PUZZLES:
            if p["theme"] in existing_themes:
                continue
            session.add(Puzzle(**p))
            inserted += 1
        await session.commit()
        total = (await session.execute(select(func.count(Puzzle.id)))).scalar_one() or 0
        return inserted, total


async def _seed_demo_users() -> tuple[int, int]:
    async with SessionLocal() as session:
        existing_emails = {
            row[0]
            for row in (
                await session.execute(
                    select(User.email).where(
                        User.email.in_([email for email, _, _ in DEMO_USERS])
                    )
                )
            ).all()
        }
        inserted = 0
        for email, display_name, city in DEMO_USERS:
            if email in existing_emails:
                continue
            session.add(
                User(
                    email=email,
                    password_hash=hash_password("demodemo"),
                    display_name=display_name,
                    city=city,
                )
            )
            inserted += 1
        await session.commit()
        total = (
            await session.execute(
                select(func.count(User.id)).where(
                    User.email.in_([email for email, _, _ in DEMO_USERS])
                )
            )
        ).scalar_one() or 0
        return inserted, total


async def main() -> None:
    await create_all()
    puzzles_inserted, puzzles_total = await _seed_puzzles()
    demos_inserted, demos_total = await _seed_demo_users()
    print(
        "seed status:"
        f" puzzles_inserted={puzzles_inserted}; puzzles_total={puzzles_total};"
        f" demo_users_inserted={demos_inserted}; demo_users_total={demos_total}"
    )


if __name__ == "__main__":
    asyncio.run(main())
