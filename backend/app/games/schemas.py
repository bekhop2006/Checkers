"""Pydantic schemas for the games REST/WS API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TimeControl(BaseModel):
    initial_seconds: int = Field(default=300, ge=10, le=3600)
    increment_seconds: int = Field(default=0, ge=0, le=60)


class CreateVsAiIn(BaseModel):
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard|expert)$")
    player_color: str = Field(default="white", pattern="^(white|black|random)$")
    time_control: TimeControl = Field(default_factory=TimeControl)


class CreateFriendIn(BaseModel):
    time_control: TimeControl = Field(default_factory=TimeControl)


class CreateRankedIn(BaseModel):
    time_control: TimeControl = Field(default_factory=TimeControl)


class JoinFriendIn(BaseModel):
    token: str


class GameSummaryOut(BaseModel):
    id: int
    mode: str
    status: str
    result: str
    end_reason: str | None
    white_user_id: int | None
    black_user_id: int | None
    ai_difficulty: str | None
    created_at: datetime
    ended_at: datetime | None

    class Config:
        from_attributes = True


class MoveOut(BaseModel):
    ply: int
    side: int
    notation: str
    path: list
    captured: list
    promoted: bool
    classification: str | None = None
    eval_before: int | None = None
    eval_after: int | None = None
    best_line: list | None = None
    narrative: str | None = None

    class Config:
        from_attributes = True


class LegalMoveOut(BaseModel):
    path: list  # [[r,c], ...]
    captured: list = []
    promoted: bool = False


class GameDetailOut(GameSummaryOut):
    position: dict
    white_ms_left: int
    black_ms_left: int
    initial_seconds: int
    increment_seconds: int
    friend_token: str | None
    moves: list[MoveOut]
    legal_moves: list[LegalMoveOut] = []
    coach_status: str
    coach_data: dict | None = None
    white_rating_before: int | None = None
    black_rating_before: int | None = None
    white_rating_after: int | None = None
    black_rating_after: int | None = None
