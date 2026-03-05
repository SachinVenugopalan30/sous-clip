from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.auth import create_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    token = create_token(username="testuser")
    return {"Authorization": f"Bearer {token}"}


@patch("backend.routes.auth.verify_credentials", return_value=True)
def test_login_success(mock_verify, client):
    resp = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "changeme",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["username"] == "admin"


@patch("backend.routes.auth.verify_credentials", return_value=False)
def test_login_wrong_credentials(mock_verify, client):
    resp = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_missing_fields(client):
    resp = client.post("/api/auth/login", json={})
    assert resp.status_code == 422


def test_me_with_valid_token(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testuser"


def test_me_without_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
