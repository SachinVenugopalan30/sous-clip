from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/recipes.db"

    whisper_model_size: str = "base"
    whisper_device: str = "auto"
    whisper_compute_type: str = "auto"

    ai_provider: str = "anthropic"  # "anthropic" | "openai" | "ollama"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ai_model: str = "claude-sonnet-4-6"

    temporal_host: str = "localhost:7233"

    valkey_url: str = "redis://localhost:6379/0"

    media_dir: str = "./data/media"

    app_username: str = "admin"
    app_password: str = "changeme"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    otel_enabled: bool = False
    otel_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "sous-clip"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
