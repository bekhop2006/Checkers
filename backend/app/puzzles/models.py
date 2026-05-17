"""Puzzle tables: a position + the correct solution path."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class Puzzle(Base):
    __tablename__ = "puzzles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    theme: Mapped[str] = mapped_column(String(40), nullable=False, default="tactics")
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1..5
    side_to_move: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0=white
    position: Mapped[dict] = mapped_column(JSON, nullable=False)
    solution: Mapped[list] = mapped_column(JSON, nullable=False)  # [[[r,c],...], ...]
    description: Mapped[str] = mapped_column(String(140), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PuzzleAttempt(Base):
    __tablename__ = "puzzle_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    puzzle_id: Mapped[int] = mapped_column(ForeignKey("puzzles.id"), index=True, nullable=False)
    solved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    date_iso: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
