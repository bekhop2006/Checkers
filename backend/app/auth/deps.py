"""FastAPI dependencies for authentication."""

from __future__ import annotations

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from .models import User
from .security import decode_token


async def get_current_user(
    access_token: str | None = Cookie(default=None, alias="access_token"),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    try:
        payload = decode_token(access_token, expected_scope="access")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
    user_id = int(payload["sub"])
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")
    return user


async def get_current_user_optional(
    access_token: str | None = Cookie(default=None, alias="access_token"),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    if not access_token:
        return None
    try:
        payload = decode_token(access_token, expected_scope="access")
    except ValueError:
        return None
    user_id = int(payload["sub"])
    return await session.get(User, user_id)


async def require_pro(user: User = Depends(get_current_user)) -> User:
    if not user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="this feature requires a Pro subscription",
        )
    return user
