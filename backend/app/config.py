"""Application configuration loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    domain: str = "localhost"
    env: Literal["dev", "test", "prod"] = "dev"

    database_url: str = "sqlite+aiosqlite:///./checkers.db"
    auto_create_schema: bool = True

    allowed_origins: str = "http://localhost:5173,http://localhost"

    jwt_secret: str = "dev-secret-change-me"
    jwt_alg: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    ws_ticket_ttl_seconds: int = 60

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_monthly: str = ""
    stripe_price_yearly: str = ""
    stripe_success_url: str = "http://localhost:5173/billing/success"
    stripe_cancel_url: str = "http://localhost:5173/pricing"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def cookie_secure(self) -> bool:
        return self.env == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
