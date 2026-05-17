"""Lazy Stripe SDK initialization.

Stripe import is deferred so the app starts cleanly even without keys
(useful for local dev / CI smoke tests).
"""

from __future__ import annotations

from typing import Any

from ..config import get_settings

_stripe: Any | None = None


def get_stripe() -> Any:
    global _stripe
    if _stripe is None:
        import stripe as _s

        s = get_settings()
        _s.api_key = s.stripe_secret_key
        _stripe = _s
    return _stripe


def is_configured() -> bool:
    s = get_settings()
    return bool(s.stripe_secret_key and s.stripe_webhook_secret)
