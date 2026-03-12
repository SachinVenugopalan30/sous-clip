from sqlmodel import Session, select

from backend.config import settings as env_settings
from backend.models import AppSetting

DEFAULTS = {
    "ai_provider": env_settings.ai_provider,
    "ai_model": env_settings.ai_model,
    "anthropic_api_key": env_settings.anthropic_api_key,
    "openai_api_key": env_settings.openai_api_key,
    "ollama_base_url": env_settings.ollama_base_url,
    "whisper_model_size": env_settings.whisper_model_size,
    "whisper_device": env_settings.whisper_device,
    "whisper_compute_type": env_settings.whisper_compute_type,
    "mealie_url": "",
    "mealie_api_key": "",
}

# Keys that should never be returned to the frontend in plain text
SENSITIVE_KEYS = {"anthropic_api_key", "openai_api_key", "mealie_api_key"}


class SettingsService:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self, mask_sensitive: bool = False) -> dict[str, str]:
        result = dict(DEFAULTS)
        stored = self.session.exec(select(AppSetting)).all()
        for setting in stored:
            result[setting.key] = setting.value
        if mask_sensitive:
            for key in SENSITIVE_KEYS:
                if result.get(key):
                    result[key] = "••••••" + result[key][-4:] if len(result[key]) > 4 else "••••••"
        return result

    def get(self, key: str, default: str | None = None) -> str | None:
        setting = self.session.get(AppSetting, key)
        if setting:
            return setting.value
        return DEFAULTS.get(key, default)

    def update(self, key: str, value: str) -> None:
        setting = self.session.get(AppSetting, key)
        if setting:
            setting.value = value
        else:
            setting = AppSetting(key=key, value=value)
            self.session.add(setting)
        self.session.commit()

    def update_many(self, updates: dict[str, str]) -> None:
        for key, value in updates.items():
            setting = self.session.get(AppSetting, key)
            if setting:
                setting.value = value
            else:
                self.session.add(AppSetting(key=key, value=value))
        self.session.commit()
