import os
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env (never committed)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./subsecure.db"
    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    APP_ENV: str = "development"
    GEMINI_API_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def secure_jwt_secret_configured(self) -> bool:
        return self.JWT_SECRET not in {
            "",
            "dev-only-insecure-secret-change-me",
            "replace-with-a-long-random-secret",
        } and len(self.JWT_SECRET) >= 32

    @model_validator(mode="after")
    def validate_jwt_secret(self):
        # Keep local development and the test suite convenient, but fail
        # closed for deployment-like environments instead of silently using a
        # predictable signing key.
        environment = (self.APP_ENV or os.getenv("APP_ENV", "development")).lower()
        if environment in {"production", "staging"} and not self.secure_jwt_secret_configured:
            raise ValueError("JWT_SECRET must be a random value of at least 32 characters in staging/production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
