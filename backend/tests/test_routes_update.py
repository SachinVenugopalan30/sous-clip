from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.config import settings
from backend.database import get_session
from backend.main import app
from backend.models import AppSetting
from backend.services import updates


@pytest.fixture
def client(db_engine, monkeypatch):
    def override_session():
        with Session(db_engine) as session:
            yield session

    monkeypatch.setattr(updates, "_cache", None)
    app.dependency_overrides[get_session] = override_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def github():
    """Patched GitHub call; set .return_value.json.return_value or .side_effect per test."""
    with patch("backend.services.updates.httpx.AsyncClient.get", new_callable=AsyncMock) as get:
        get.return_value = MagicMock(json=MagicMock(return_value={"tag_name": "v1.10.0"}))
        yield get


@pytest.mark.parametrize("current, available", [("v1.9.0", True), ("v1.10.0", False), ("v1.11.0", False)])
def test_update_available_compares_numerically(client, auth_headers, github, monkeypatch, current, available):
    monkeypatch.setattr(settings, "app_version", current)
    body = client.get("/api/update", headers=auth_headers).json()
    assert (body["current"], body["latest"], body["update_available"]) == (current, "v1.10.0", available)


def test_dev_build_skips_github(client, auth_headers, github):
    body = client.get("/api/update", headers=auth_headers).json()
    assert body["latest"] is None and body["update_available"] is False
    github.assert_not_called()


def test_disabled_check_skips_github(client, auth_headers, github, db_session, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    db_session.add(AppSetting(key="update_check", value="false"))
    db_session.commit()
    assert client.get("/api/update", headers=auth_headers).json()["update_available"] is False
    github.assert_not_called()


def test_github_is_called_once_per_hour(client, auth_headers, github, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    client.get("/api/update", headers=auth_headers)
    client.get("/api/update", headers=auth_headers)
    github.assert_called_once()


def test_github_error_means_no_update(client, auth_headers, github, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    github.side_effect = httpx.ConnectError("offline")
    body = client.get("/api/update", headers=auth_headers).json()
    assert body["latest"] is None and body["update_available"] is False


def test_requires_login(client):
    assert client.get("/api/update").status_code == 401
