"""Async SQLAlchemy 2.x setup."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()

engine = create_async_engine(
    _settings.database_url,
    pool_pre_ping=True,
    future=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """For use outside FastAPI dependency injection (background tasks etc.)."""
    async with SessionLocal() as session:
        yield session


async def create_all() -> None:
    """Convenience for tests / dev: build schema directly without Alembic."""
    from . import auth  # noqa: F401
    from .billing import models as _billing_models  # noqa: F401
    from .games import models as _games_models  # noqa: F401
    from .puzzles import models as _puzzles_models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
