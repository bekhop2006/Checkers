"""Standard ELO rating update."""

from __future__ import annotations


def expected_score(rating_a: int, rating_b: int) -> float:
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def k_factor(rating: int) -> int:
    return 32 if rating < 2100 else 16


def update_ratings(rating_a: int, rating_b: int, score_a: float) -> tuple[int, int]:
    """Return updated ratings for two players.

    ``score_a`` is 1.0 (A wins), 0.5 (draw) or 0.0 (B wins).
    """
    expected_a = expected_score(rating_a, rating_b)
    expected_b = 1.0 - expected_a
    score_b = 1.0 - score_a
    k_a = k_factor(rating_a)
    k_b = k_factor(rating_b)
    new_a = round(rating_a + k_a * (score_a - expected_a))
    new_b = round(rating_b + k_b * (score_b - expected_b))
    return new_a, new_b
