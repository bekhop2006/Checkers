"""Password hashing + JWT helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import get_settings

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_ctx.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _pwd_ctx.verify(password, hashed)
    except Exception:
        return False


# --- JWT --------------------------------------------------------------------


def _encode(payload: dict[str, Any], ttl: timedelta, scope: str) -> str:
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    body = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "scope": scope,
    }
    return jwt.encode(body, settings.jwt_secret, algorithm=settings.jwt_alg)


def make_access_token(user_id: int) -> str:
    s = get_settings()
    return _encode({"sub": str(user_id)}, timedelta(minutes=s.access_token_ttl_minutes), "access")


def make_refresh_token(user_id: int) -> str:
    s = get_settings()
    return _encode({"sub": str(user_id)}, timedelta(days=s.refresh_token_ttl_days), "refresh")


def make_ws_ticket(user_id: int, game_id: int) -> str:
    s = get_settings()
    return _encode(
        {"sub": str(user_id), "game_id": game_id},
        timedelta(seconds=s.ws_ticket_ttl_seconds),
        "ws",
    )


def decode_token(token: str, expected_scope: str | None = None) -> dict[str, Any]:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_alg])
    except JWTError as e:
        raise ValueError(f"invalid token: {e}") from e
    if expected_scope and payload.get("scope") != expected_scope:
        raise ValueError(f"wrong token scope (expected {expected_scope})")
    return payload
