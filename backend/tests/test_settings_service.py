from sqlmodel import Session

from backend.services.settings import SettingsService


def test_get_default_settings(db_session: Session):
    svc = SettingsService(db_session)
    settings = svc.get_all()
    assert settings["ai_provider"] == "anthropic"
    assert settings["whisper_model_size"] == "base"
    assert settings["whisper_device"] == "auto"


def test_update_setting(db_session: Session):
    svc = SettingsService(db_session)
    svc.update("ai_provider", "openai")
    settings = svc.get_all()
    assert settings["ai_provider"] == "openai"


def test_update_multiple_settings(db_session: Session):
    svc = SettingsService(db_session)
    svc.update_many({
        "ai_provider": "ollama",
        "ai_model": "llama3",
        "whisper_model_size": "large-v3",
    })
    settings = svc.get_all()
    assert settings["ai_provider"] == "ollama"
    assert settings["ai_model"] == "llama3"
    assert settings["whisper_model_size"] == "large-v3"


def test_get_single_setting(db_session: Session):
    svc = SettingsService(db_session)
    svc.update("ai_provider", "openai")
    assert svc.get("ai_provider") == "openai"
    assert svc.get("nonexistent", "default") == "default"
