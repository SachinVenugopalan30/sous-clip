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

    monkeypatch.setattr(updates, "_cache", {})
    app.dependency_overrides[get_session] = override_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def github():
    """Patched GitHub API: latest release v1.10.0, 7 stars. Override .side_effect per test."""
    def reply(url, *args, **kwargs):
        body = {"tag_name": "v1.10.0"} if url.endswith("/releases/latest") else {"stargazers_count": 7}
        return MagicMock(json=MagicMock(return_value=body))

    with patch("backend.services.updates.httpx.AsyncClient.get", new_callable=AsyncMock) as get:
        get.side_effect = reply
        yield get


@pytest.mark.parametrize("current, available", [("v1.9.0", True), ("v1.10.0", False), ("v1.11.0", False)])
def test_update_available_compares_numerically(client, auth_headers, github, monkeypatch, current, available):
    monkeypatch.setattr(settings, "app_version", current)
    body = client.get("/api/update", headers=auth_headers).json()
    assert (body["current"], body["latest"], body["update_available"]) == (current, "v1.10.0", available)


def test_dev_build_skips_the_release_check_but_shows_stars(client, auth_headers, github):
    body = client.get("/api/update", headers=auth_headers).json()
    assert (body["latest"], body["update_available"], body["stars"]) == (None, False, 7)
    assert [c.args[0] for c in github.call_args_list] == [updates.REPO_URL]


def test_disabled_check_skips_github(client, auth_headers, github, db_session, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    db_session.add(AppSetting(key="update_check", value="false"))
    db_session.commit()
    body = client.get("/api/update", headers=auth_headers).json()
    assert (body["update_available"], body["stars"]) == (False, None)
    github.assert_not_called()  # "Check GitHub" off means no GitHub calls at all


def test_github_is_called_once_per_hour(client, auth_headers, github, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    client.get("/api/update", headers=auth_headers)
    client.get("/api/update", headers=auth_headers)
    assert sorted(c.args[0] for c in github.call_args_list) == sorted([updates.RELEASES_URL, updates.REPO_URL])


def test_github_error_means_no_update(client, auth_headers, github, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    github.side_effect = httpx.ConnectError("offline")
    body = client.get("/api/update", headers=auth_headers).json()
    assert (body["latest"], body["update_available"], body["stars"]) == (None, False, None)


def test_status_includes_live_star_count(client, auth_headers, github, monkeypatch):
    monkeypatch.setattr(settings, "app_version", "v1.9.0")
    assert client.get("/api/update", headers=auth_headers).json()["stars"] == 7


def test_requires_login(client):
    assert client.get("/api/update").status_code == 401


@pytest.fixture
def watchtower_token(monkeypatch):
    monkeypatch.setattr(settings, "watchtower_http_api_token", "wt-token")


@pytest.mark.parametrize("token, probe, expected", [
    ("wt-token", MagicMock(status_code=404), True),  # any HTTP answer means Watchtower is running
    ("wt-token", httpx.ConnectError("no such host"), False),
    ("", MagicMock(status_code=200), False),  # no token: the button could never work
], ids=["reachable", "unreachable", "no-token"])
def test_status_reports_watchtower(client, auth_headers, monkeypatch, token, probe, expected):
    monkeypatch.setattr(settings, "watchtower_http_api_token", token)
    def reply(url, *args, **kwargs):  # route by URL: the star lookup shares this client method
        if url.startswith("https://api.github.com"):
            return MagicMock(json=MagicMock(return_value={"stargazers_count": 7}))
        if isinstance(probe, Exception):
            raise probe
        return probe

    with patch("backend.services.updates.httpx.AsyncClient.get", new_callable=AsyncMock) as get:
        get.side_effect = reply
        assert client.get("/api/update", headers=auth_headers).json()["watchtower"] is expected


@pytest.mark.parametrize("status, ok, error", [
    (202, True, None),
    (200, True, None),
    (401, False, "WATCHTOWER_HTTP_API_TOKEN"),
    (429, False, "already running"),
], ids=["202", "200", "401", "429"])
def test_trigger_update_forwards_token_async(client, auth_headers, watchtower_token, status, ok, error):
    with patch("backend.services.updates.httpx.AsyncClient.post", new_callable=AsyncMock) as post:
        post.return_value = MagicMock(status_code=status)
        body = client.post("/api/update", headers=auth_headers).json()

    assert post.call_args.args[0] == "http://watchtower:8080/v1/update"
    assert post.call_args.kwargs["params"] == {"async": "true"}
    assert post.call_args.kwargs["headers"] == {"Authorization": "Bearer wt-token"}
    assert body["ok"] is ok
    assert error is None or error in body["error"]


def test_trigger_update_without_token_or_watchtower(client, auth_headers, monkeypatch):
    assert client.post("/api/update", headers=auth_headers).json()["ok"] is False
    monkeypatch.setattr(settings, "watchtower_http_api_token", "wt-token")
    with patch("backend.services.updates.httpx.AsyncClient.post", new_callable=AsyncMock) as post:
        post.side_effect = httpx.ConnectError("no such host")
        assert client.post("/api/update", headers=auth_headers).json()["ok"] is False


def test_trigger_update_requires_login(client):
    assert client.post("/api/update").status_code == 401
