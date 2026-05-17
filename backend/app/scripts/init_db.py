"""Initialize database schema once (safe to run repeatedly)."""

from __future__ import annotations

import asyncio

from app.db import create_all


async def _main() -> None:
    await create_all()
    print("DB schema is ready")


if __name__ == "__main__":
    asyncio.run(_main())
