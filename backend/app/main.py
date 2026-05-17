"""FastAPI app entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth.routes import router as auth_router
from .auth.routes import user_router
from .billing.routes import router as billing_router
from .coach.routes import router as coach_router
from .config import get_settings
from .db import create_all
from .games.routes import router as games_router
from .games.ws import router as ws_router
from .leaderboard.routes import router as leaderboard_router
from .puzzles.routes import router as puzzles_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup. Idempotent — SQLAlchemy's create_all
    # only creates missing tables, so it works for both fresh installs and
    # restarts. (When schema changes land later, swap this for Alembic.)
    await create_all()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Checkers API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"ok": True}

    # All HTTP routes nested under /api so the Caddy reverse proxy can
    # route cleanly (Caddyfile: /api/* -> backend; / -> frontend).
    app.include_router(auth_router, prefix="/api")
    app.include_router(user_router, prefix="/api")
    app.include_router(games_router, prefix="/api")
    app.include_router(coach_router, prefix="/api")
    app.include_router(leaderboard_router, prefix="/api")
    app.include_router(puzzles_router, prefix="/api")
    app.include_router(billing_router, prefix="/api")
    # WebSocket lives at /ws/... (no /api prefix) — matches the deployment
    # plan's Caddy routing.
    app.include_router(ws_router)

    return app


app = create_app()
