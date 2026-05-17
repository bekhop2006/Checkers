"""Skin catalog. Free skins are open to everyone; Pro skins gate behind Stripe."""

from __future__ import annotations

PIECE_SKINS = {
    "classic": {"label": "Классика", "pro": False},
    "wood": {"label": "Дерево", "pro": False},
    "neon": {"label": "Неон", "pro": False},
    "marble": {"label": "Мрамор", "pro": True},
    "gold": {"label": "Золото", "pro": True},
    "blitz": {"label": "Blitz", "pro": True},
}

BOARD_SKINS = {
    "classic": {"label": "Классика", "pro": False},
    "midnight": {"label": "Полночь", "pro": False},
    "forest": {"label": "Лес", "pro": False},
    "neon": {"label": "Неон", "pro": True},
    "lavender": {"label": "Лаванда", "pro": True},
}


def requires_pro(skin_id: str) -> bool:
    info = PIECE_SKINS.get(skin_id) or BOARD_SKINS.get(skin_id)
    if not info:
        return False
    return bool(info.get("pro"))


def is_known_piece_skin(skin_id: str) -> bool:
    return skin_id in PIECE_SKINS


def is_known_board_skin(skin_id: str) -> bool:
    return skin_id in BOARD_SKINS


def catalog() -> dict:
    return {"pieces": PIECE_SKINS, "boards": BOARD_SKINS}
