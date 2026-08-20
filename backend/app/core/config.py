from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "pro100_repik"
    database_url: str = "postgresql+psycopg://pro100:pro100_password@db:5432/pro100_repik"
    jwt_secret_key: str = "change-me"
    jwt_refresh_secret_key: str = "change-me-refresh"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    backend_cors_origins: str = "http://localhost,http://localhost:5173,http://127.0.0.1:5173,http://localhost:80,http://127.0.0.1"
    first_admin_login: str = "admin"
    first_admin_password: str = "admin12345"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.backend_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
