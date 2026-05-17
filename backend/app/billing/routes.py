"""Stripe Checkout creation + Customer Portal + Pro entitlements info."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import get_current_user
from ..auth.models import User
from ..config import get_settings
from ..db import get_session
from .models import StripeEvent
from .skins import catalog
from .stripe_client import get_stripe, is_configured

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutIn(BaseModel):
    plan: Literal["monthly", "yearly"] = "monthly"


class CheckoutOut(BaseModel):
    url: str


@router.get("/config")
async def billing_config() -> dict:
    s = get_settings()
    return {
        "configured": is_configured(),
        "publishable_key": s.stripe_publishable_key or None,
        "prices": {
            "monthly": s.stripe_price_monthly or None,
            "yearly": s.stripe_price_yearly or None,
        },
        "skins": catalog(),
    }


@router.post("/checkout", response_model=CheckoutOut)
async def create_checkout(
    payload: CheckoutIn,
    user: User = Depends(get_current_user),
) -> CheckoutOut:
    if user.kids_mode:
        raise HTTPException(status_code=403, detail="billing disabled in kids mode")
    s = get_settings()
    if not is_configured():
        raise HTTPException(status_code=503, detail="billing not configured")
    price = s.stripe_price_monthly if payload.plan == "monthly" else s.stripe_price_yearly
    if not price:
        raise HTTPException(status_code=503, detail="price not configured")
    stripe = get_stripe()
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price, "quantity": 1}],
        customer_email=user.email,
        client_reference_id=str(user.id),
        success_url=s.stripe_success_url,
        cancel_url=s.stripe_cancel_url,
        metadata={"user_id": str(user.id), "plan": payload.plan},
    )
    return CheckoutOut(url=session.url)


@router.post("/portal")
async def billing_portal(user: User = Depends(get_current_user)) -> dict:
    if user.kids_mode:
        raise HTTPException(status_code=403, detail="billing disabled in kids mode")
    s = get_settings()
    if not is_configured():
        raise HTTPException(status_code=503, detail="billing not configured")
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="no Stripe customer for this user")
    stripe = get_stripe()
    portal = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=s.stripe_cancel_url,
    )
    return {"url": portal.url}




@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    s = get_settings()
    if not is_configured():
        raise HTTPException(status_code=503, detail="billing not configured")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    stripe = get_stripe()
    try:
        event = stripe.Webhook.construct_event(payload, sig, s.stripe_webhook_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"signature error: {e}") from e

    existing = await session.get(StripeEvent, event["id"])
    if existing is not None:
        return {"received": True, "duplicate": True}
    session.add(StripeEvent(id=event["id"], type=event["type"]))

    etype = event["type"]
    data = event["data"]["object"]
    from ..auth.models import User  # local import to avoid cycles

    if etype == "checkout.session.completed":
        user_id = int(data.get("client_reference_id") or data.get("metadata", {}).get("user_id") or 0)
        if user_id:
            user = await session.get(User, user_id)
            if user:
                user.stripe_customer_id = data.get("customer") or user.stripe_customer_id
                period_end = data.get("subscription_data", {}).get("trial_end") or data.get(
                    "expires_at"
                )
                if not user.pro_until:
                    user.pro_until = datetime.fromtimestamp(
                        int(period_end) if period_end else int(datetime.now().timestamp()) + 60 * 60 * 24 * 31,
                        tz=timezone.utc,
                    )

    elif etype in ("customer.subscription.created", "customer.subscription.updated"):
        cust_id = data.get("customer")
        period_end = data.get("current_period_end")
        if cust_id and period_end:
            user = (
                await session.execute(
                    User.__table__.select().where(User.stripe_customer_id == cust_id)
                )
            ).first()
            if user:
                u = await session.get(User, user.id)
                if u:
                    u.pro_until = datetime.fromtimestamp(int(period_end), tz=timezone.utc)

    elif etype == "customer.subscription.deleted":
        cust_id = data.get("customer")
        if cust_id:
            row = (
                await session.execute(
                    User.__table__.select().where(User.stripe_customer_id == cust_id)
                )
            ).first()
            if row:
                u = await session.get(User, row.id)
                if u:
                    u.pro_until = datetime.now(tz=timezone.utc)

    await session.commit()
    return {"received": True}
