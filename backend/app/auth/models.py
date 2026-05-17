"""User model — single source of truth for accounts, profile, rating, and Pro."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    display_name: Mapped[str] = mapped_column(String(40), nullable=False)
    city: Mapped[str | None] = mapped_column(String(60), index=True, nullable=True)

    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=1200)
    games_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    puzzle_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_puzzle_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    kids_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    parental_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="dark")
    board_skin: Mapped[str] = mapped_column(String(40), nullable=False, default="classic")
    piece_skin: Mapped[str] = mapped_column(String(40), nullable=False, default="classic")
    locale: Mapped[str] = mapped_column(String(8), nullable=False, default="ru")

    pro_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    coach_credits_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coach_credits_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    @property
    def is_pro(self) -> bool:
        if self.pro_until is None:
            return False
        from datetime import timezone

        return self.pro_until > datetime.now(tz=timezone.utc)
