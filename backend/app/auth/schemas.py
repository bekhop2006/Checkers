"""Pydantic schemas for auth + user endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    display_name: str = Field(min_length=2, max_length=40)
    city: str | None = Field(default=None, max_length=60)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    city: str | None
    rating: int
    games_played: int
    wins: int
    losses: int
    draws: int
    streak: int
    puzzle_streak: int
    kids_mode: bool
    theme: str
    board_skin: str
    piece_skin: str
    locale: str
    is_pro: bool
    pro_until: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=40)
    city: str | None = Field(default=None, max_length=60)
    theme: str | None = Field(default=None, pattern="^(light|dark)$")
    board_skin: str | None = Field(default=None, max_length=40)
    piece_skin: str | None = Field(default=None, max_length=40)
    locale: str | None = Field(default=None, pattern="^(ru|en)$")


class KidsModeIn(BaseModel):
    enabled: bool
    pin: str = Field(min_length=4, max_length=8)


class WsTicketOut(BaseModel):
    ticket: str
    expires_in: int
