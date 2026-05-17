"""Anthropic Claude client with prompt caching.

Falls back to a template-only response when no API key is configured,
so the app can demo end-to-end without paid credentials.
"""

from __future__ import annotations

import asyncio
from typing import Any

from ..config import get_settings
from .prompts import SYSTEM_PROMPTS, fallback_narrative

try:
    from anthropic import AsyncAnthropic
except Exception:  # pragma: no cover - optional dependency at import time
    AsyncAnthropic = None  # type: ignore[assignment]


class CoachLLM:
    def __init__(self) -> None:
        s = get_settings()
        self.enabled = bool(s.anthropic_api_key) and AsyncAnthropic is not None
        self.model = s.anthropic_model
        self.client: Any = (
            AsyncAnthropic(api_key=s.anthropic_api_key) if self.enabled else None
        )

    async def narrate(
        self,
        *,
        audience: str,
        user_message: str,
        classification: str,
    ) -> str:
        if not self.enabled:
            return fallback_narrative(classification)
        system_text = SYSTEM_PROMPTS.get(audience, SYSTEM_PROMPTS["adult"])
        try:
            resp = await self.client.messages.create(
                model=self.model,
                max_tokens=220,
                system=[
                    {
                        "type": "text",
                        "text": system_text,
                        # Static rules + style => cache it across moves of the same review.
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": user_message}],
            )
            # Concatenate all text blocks.
            parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
            text = " ".join(parts).strip()
            return text or fallback_narrative(classification)
        except Exception:
            return fallback_narrative(classification)


_llm: CoachLLM | None = None


def get_llm() -> CoachLLM:
    global _llm
    if _llm is None:
        _llm = CoachLLM()
    return _llm


async def narrate_many(audience: str, items: list[dict]) -> list[str]:
    """Run narrations sequentially (lightweight; per-game N is 3-5)."""
    llm = get_llm()
    results: list[str] = []
    for it in items:
        text = await llm.narrate(
            audience=audience,
            user_message=it["user_message"],
            classification=it["classification"],
        )
        results.append(text)
        await asyncio.sleep(0)
    return results
