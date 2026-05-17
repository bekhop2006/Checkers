"""Auth + user endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from .deps import get_current_user
from .models import User
from .schemas import (
    KidsModeIn,
    LoginIn,
    ProfileUpdateIn,
    SignupIn,
    UserOut,
    WsTicketOut,
)
from .security import (
    decode_token,
    hash_password,
    make_access_token,
    make_refresh_token,
    make_ws_ticket,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/users", tags=["users"])


def _set_auth_cookies(response: Response, user_id: int) -> None:
    settings = get_settings()
    access = make_access_token(user_id)
    refresh = make_refresh_token(user_id)
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_ttl_minutes * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_ttl_days * 86400,
        path="/api/auth",
    )


@router.post("/signup", response_model=UserOut)
async def signup(
    payload: SignupIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> User:
    existing = (
        await session.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="email already in use")
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
        city=(payload.city or "").strip() or None,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    _set_auth_cookies(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    payload: LoginIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> User:
    user = (
        await session.execute(select(User).where(User.email == payload.email.lower()))
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    _set_auth_cookies(response, user.id)
    return user


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth")
    return {"ok": True}


@router.post("/refresh", response_model=UserOut)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="no refresh token")
    try:
        payload = decode_token(refresh_token, expected_scope="refresh")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    user_id = int(payload["sub"])
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="user not found")
    _set_auth_cookies(response, user.id)
    return user


@router.post("/ws-ticket/{game_id}", response_model=WsTicketOut)
async def ws_ticket(game_id: int, user: User = Depends(get_current_user)) -> WsTicketOut:
    settings = get_settings()
    return WsTicketOut(
        ticket=make_ws_ticket(user.id, game_id),
        expires_in=settings.ws_ticket_ttl_seconds,
    )




@user_router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


@user_router.patch("/me", response_model=UserOut)
async def update_me(
    payload: ProfileUpdateIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip()
    if payload.city is not None:
        user.city = payload.city.strip() or None
    if payload.theme is not None:
        user.theme = payload.theme
    if payload.board_skin is not None:
        from ..billing.skins import is_known_board_skin, requires_pro

        if not is_known_board_skin(payload.board_skin):
            raise HTTPException(status_code=400, detail="unknown board skin")
        if requires_pro(payload.board_skin) and not user.is_pro:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="pro skin")
        user.board_skin = payload.board_skin
    if payload.piece_skin is not None:
        from ..billing.skins import is_known_piece_skin, requires_pro

        if not is_known_piece_skin(payload.piece_skin):
            raise HTTPException(status_code=400, detail="unknown piece skin")
        if requires_pro(payload.piece_skin) and not user.is_pro:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="pro skin")
        user.piece_skin = payload.piece_skin
    if payload.locale is not None:
        user.locale = payload.locale
    await session.commit()
    await session.refresh(user)
    return user


@user_router.post("/kids-mode", response_model=UserOut)
async def kids_mode(
    payload: KidsModeIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    if user.kids_mode and not user.parental_pin_hash:
        user.parental_pin_hash = hash_password(payload.pin)

    if payload.enabled:
        if user.parental_pin_hash and not verify_password(payload.pin, user.parental_pin_hash):
            raise HTTPException(status_code=401, detail="wrong pin")
        if not user.parental_pin_hash:
            user.parental_pin_hash = hash_password(payload.pin)
        user.kids_mode = True
    else:
        if not user.parental_pin_hash or not verify_password(payload.pin, user.parental_pin_hash):
            raise HTTPException(status_code=401, detail="wrong pin")
        user.kids_mode = False

    await session.commit()
    await session.refresh(user)
    return user
