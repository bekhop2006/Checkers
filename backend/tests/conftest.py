"""Shared pytest fixtures.

We point the app at a single temp SQLite file *before any app modules are
imported* so the SQLAlchemy engine singleton picks it up correctly.
"""

from __future__ import annotations

import os
import tempfile

import pytest

_TMP_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TMP_DB.close()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB.name}"
os.environ["ENV"] = "test"
os.environ.setdefault("JWT_SECRET", "test-secret")


@pytest.fixture(autouse=True)
async def clean_db():
    """Truncate all tables between tests so each starts from a known state."""
    from sqlalchemy import text

    from app.db import Base, SessionLocal, create_all

    await create_all()
    async with SessionLocal() as session:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(text(f"DELETE FROM {table.name}"))
        await session.commit()
    yield
