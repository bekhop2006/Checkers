"""Game + Move models. Stores game state, history, and coach annotations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # "vs_ai" | "friend" | "ranked"
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="vs_ai")
    # "active" | "completed" | "abandoned"
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    # one of "white", "black", "draw", "in_progress"
    result: Mapped[str] = mapped_column(String(16), nullable=False, default="in_progress")
    end_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)

    white_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=True
    )
    black_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=True
    )
    # AI metadata when no human plays one side.
    ai_difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Time control
    initial_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    increment_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    white_ms_left: Mapped[int] = mapped_column(Integer, nullable=False, default=300_000)
    black_ms_left: Mapped[int] = mapped_column(Integer, nullable=False, default=300_000)
    turn_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Friend link
    friend_token: Mapped[str | None] = mapped_column(
        String(32), unique=True, index=True, nullable=True
    )

    # Current position snapshot (Board.to_dict()).
    position: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Coach state
    coach_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="not_started"
    )  # "not_started" | "running" | "ready" | "failed"
    coach_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # ELO snapshots
    white_rating_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    black_rating_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    white_rating_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    black_rating_after: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    moves: Mapped[list["Move"]] = relationship(
        back_populates="game",
        order_by="Move.ply",
        cascade="all, delete-orphan",
    )


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), index=True, nullable=False
    )
    ply: Mapped[int] = mapped_column(Integer, nullable=False)
    # 0 = white, 1 = black (matches engine.Color values).
    side: Mapped[int] = mapped_column(Integer, nullable=False)
    # Algebraic notation, e.g. "c3-d4" or "c3xe5xg3".
    notation: Mapped[str] = mapped_column(String(64), nullable=False)
    # Full path as list of [row, col].
    path: Mapped[list] = mapped_column(JSON, nullable=False)
    captured: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    promoted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Per-move coach annotation, written by analyzer + LLM.
    classification: Mapped[str | None] = mapped_column(String(20), nullable=True)
    eval_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eval_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    best_line: Mapped[list | None] = mapped_column(JSON, nullable=True)
    narrative: Mapped[str | None] = mapped_column(String(800), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    game: Mapped[Game] = relationship(back_populates="moves")
