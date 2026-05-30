from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Dynamic Pricing Engine"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev_secret_key_change_in_production"
    DEBUG: bool = True
    USE_IN_MEMORY_DB: bool = False

    # MongoDB
    MONGODB_URL: str = "mongodb://admin:dpe_secret_2024@localhost:27017/dynamic_pricing?authSource=admin"
    DATABASE_NAME: str = "dynamic_pricing"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 300  # 5 minutes

    # Scraper
    SCRAPER_INTERVAL_HOURS: int = 2
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3

    # ML Config
    FORECAST_HORIZON_DAYS: int = 30
    CONFIDENCE_THRESHOLD: float = 0.75
    MIN_DATA_POINTS: int = 14  # min days for ML model
    COLD_START_CATEGORY_PRIOR: bool = True

    # RL Agent Config
    RL_LEARNING_RATE: float = 0.1
    RL_DISCOUNT_FACTOR: float = 0.95
    RL_EPSILON: float = 0.1
    RL_EPSILON_DECAY: float = 0.995

    # Pricing Guardrails
    MIN_MARGIN_FLOOR: float = 0.08  # 8% minimum margin
    MAX_PRICE_CHANGE_PCT: float = 0.25  # max 25% change per cycle

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
