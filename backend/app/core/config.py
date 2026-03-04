from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Crunched"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://sondrerogde@localhost:5432/crunched"
    CORS_ORIGINS: List[str] = [
        "https://localhost:3000",
        "http://localhost:3000",
    ]
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ANTHROPIC_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
