import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from backend.main import app
from backend.database import get_session
from backend.services.auth import create_token


@pytest.fixture
def auth_headers():
    token = create_token(username="testuser")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_db(tmp_path):
    db_url = f"sqlite:///{tmp_path}/test.db"
    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)

    def override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    yield engine
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def client(test_db):
    return TestClient(app)


def test_get_settings(client, auth_headers):
    resp = client.get("/api/settings", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "ai_provider" in data
    assert "whisper_model_size" in data


def test_update_settings(client, auth_headers):
    resp = client.put("/api/settings", json={
        "ai_provider": "openai",
        "ai_model": "gpt-4o",
        "whisper_model_size": "medium",
    }, headers=auth_headers)
    assert resp.status_code == 200

    resp = client.get("/api/settings", headers=auth_headers)
    data = resp.json()
    assert data["ai_provider"] == "openai"
    assert data["ai_model"] == "gpt-4o"
    assert data["whisper_model_size"] == "medium"


def test_settings_requires_auth(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 401


def test_test_ai_uses_stored_key_when_field_is_still_masked(client, auth_headers, test_db):
    from unittest.mock import AsyncMock, patch
    from backend.models import AppSetting
    with Session(test_db) as session:
        session.add(AppSetting(key="custom_api_key", value="sk-stored"))
        session.commit()

    with patch("backend.routes.settings.detect_api_style", new_callable=AsyncMock, return_value="anthropic") as detect:
        resp = client.post("/api/settings/test-ai", json={"base_url": "http://h", "model": "m", "api_key": "••••••ored"}, headers=auth_headers)

    assert resp.json() == {"ok": True, "style": "anthropic"}
    detect.assert_awaited_once_with("http://h", "sk-stored", "m")


def test_test_ai_reports_detection_failure(client, auth_headers):
    from unittest.mock import AsyncMock, patch
    with patch("backend.routes.settings.detect_api_style", new_callable=AsyncMock, side_effect=ValueError("OpenAI-style: x Anthropic-style: y")):
        resp = client.post("/api/settings/test-ai", json={"base_url": "http://h", "model": "m"}, headers=auth_headers)
    assert resp.json() == {"ok": False, "error": "OpenAI-style: x Anthropic-style: y"}


def test_custom_api_key_is_masked(client, auth_headers):
    client.put("/api/settings", json={"custom_api_key": "sk-secret-1234"}, headers=auth_headers)
    assert client.get("/api/settings", headers=auth_headers).json()["custom_api_key"] == "••••••1234"
