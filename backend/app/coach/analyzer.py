"""Post-game analyzer: classifies every move and adds LLM narratives.

Runs as a background task triggered when a game ends.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.models import User
from ..db import SessionLocal
from ..games.engine import Board, Color, apply_move
from ..games.engine.moves import Move as EngineMove, generate_legal_moves
from ..games.engine.search import evaluate_with_search
from ..games.models import Game, Move
from .llm import narrate_many
from .prompts import build_user_message, fallback_narrative

THRESHOLDS = {
    "blunder": 200,
    "mistake": 80,
    "inaccuracy": 30,
}


def classify_delta(delta_cp: int) -> str:
    """Classify a move based on how much it hurt the player's position.

    ``delta_cp`` is the *drop* in evaluation from the player's POV:
    positive = the position got worse for them.
    """
    if delta_cp >= THRESHOLDS["blunder"]:
        return "blunder"
    if delta_cp >= THRESHOLDS["mistake"]:
        return "mistake"
    if delta_cp >= THRESHOLDS["inaccuracy"]:
        return "inaccuracy"
    if delta_cp <= -120:
        return "excellent"
    if delta_cp <= -30:
        return "good"
    return "ok"


@dataclass
class _AnalyzedMove:
    ply: int
    side: int
    notation: str
    classification: str
    eval_before: int
    eval_after: int
    best_line: list[str]


def _replay_for_analysis(
    persisted_moves: list[Move],
) -> list[_AnalyzedMove]:
    board = Board.initial()
    out: list[_AnalyzedMove] = []
    for m in persisted_moves:
        side = Color(m.side)
        legal = generate_legal_moves(board)
        path_tuple = tuple(tuple(s) for s in m.path)
        eng_move: EngineMove | None = next(
            (x for x in legal if x.path == path_tuple), None
        )
        if eng_move is None:
            break

        eval_before = evaluate_with_search(board, depth=4, time_budget=0.25)
        scored: list[tuple[int, EngineMove]] = []
        for cand in legal:
            child = apply_move(board, cand)
            cscore = -evaluate_with_search(child, depth=3, time_budget=0.15)
            scored.append((cscore, cand))
        scored.sort(key=lambda x: -x[0])
        best_line_alg = [c.to_algebraic() for _, c in scored[:3]]

        new_board = apply_move(board, eng_move)
        eval_after = -evaluate_with_search(new_board, depth=4, time_budget=0.25)
        delta = eval_before - eval_after

        out.append(
            _AnalyzedMove(
                ply=m.ply,
                side=m.side,
                notation=m.notation,
                classification=classify_delta(delta),
                eval_before=eval_before,
                eval_after=eval_after,
                best_line=best_line_alg,
            )
        )
        board = new_board
    return out


def _pick_pivotal(analyzed: list[_AnalyzedMove], limit: int = 5) -> list[_AnalyzedMove]:
    def score(a: _AnalyzedMove) -> int:
        return max(a.eval_before - a.eval_after, a.eval_after - a.eval_before)

    return sorted(analyzed, key=score, reverse=True)[:limit]


async def schedule_analysis(game_id: int) -> None:
    """Run analysis for ``game_id`` and persist annotations + summary."""
    async with SessionLocal() as session:
        game: Game | None = (
            await session.execute(
                select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
            )
        ).scalar_one_or_none()
        if not game or game.status != "completed":
            return
        if game.coach_status in ("ready", "running"):
            return
        game.coach_status = "running"
        await session.commit()

    try:
        async with SessionLocal() as session:
            game = (
                await session.execute(
                    select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
                )
            ).scalar_one()
            persisted = list(game.moves)

        analyzed = await asyncio.to_thread(_replay_for_analysis, persisted)
        pivotal = _pick_pivotal(analyzed)

        async with SessionLocal() as session:
            audience = "adult"
            game = (
                await session.execute(
                    select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
                )
            ).scalar_one()
            for uid in (game.white_user_id, game.black_user_id):
                if uid is None:
                    continue
                u = await session.get(User, uid)
                if u and u.kids_mode:
                    audience = "kid"
                    break
                if u and u.is_pro:
                    audience = "expert"

        narration_inputs = []
        for a in pivotal:
            narration_inputs.append(
                {
                    "user_message": build_user_message(
                        audience=audience,
                        move_number=(a.ply // 2) + 1,
                        side="белые" if a.side == 0 else "чёрные",
                        played=a.notation,
                        classification=a.classification,
                        eval_before=a.eval_before,
                        eval_after=a.eval_after,
                        top_lines=a.best_line,
                    ),
                    "classification": a.classification,
                }
            )
        narratives = await narrate_many(audience, narration_inputs)

        narrative_by_ply = {a.ply: n for a, n in zip(pivotal, narratives, strict=False)}

        async with SessionLocal() as session:
            game = (
                await session.execute(
                    select(Game).options(selectinload(Game.moves)).where(Game.id == game_id)
                )
            ).scalar_one()
            ana_by_ply = {a.ply: a for a in analyzed}
            for m in game.moves:
                a = ana_by_ply.get(m.ply)
                if not a:
                    continue
                m.classification = a.classification
                m.eval_before = a.eval_before
                m.eval_after = a.eval_after
                m.best_line = a.best_line
                if m.ply in narrative_by_ply:
                    m.narrative = narrative_by_ply[m.ply]
                elif a.classification in ("blunder", "mistake"):
                    m.narrative = fallback_narrative(a.classification)
            summary = {
                "audience": audience,
                "counts": {"white": {}, "black": {}},
                "pivotal_plies": [a.ply for a in pivotal],
            }
            for a in analyzed:
                key = "white" if a.side == 0 else "black"
                summary["counts"][key][a.classification] = (
                    summary["counts"][key].get(a.classification, 0) + 1
                )
            game.coach_data = summary
            game.coach_status = "ready"
            await session.commit()
    except Exception:
        async with SessionLocal() as session:
            game = await session.get(Game, game_id)
            if game:
                game.coach_status = "failed"
                await session.commit()
        raise
