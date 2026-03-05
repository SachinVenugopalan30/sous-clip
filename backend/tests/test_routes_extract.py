from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.auth import create_token
from backend.services.queue import QueueItem, QueueStatus


@pytest.fixture
def auth_headers():
    token = create_token(username="testuser")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_queue():
    with patch("backend.routes.extract.get_queue") as mock_get:
        mock_q = MagicMock()
        mock_get.return_value = mock_q
        mock_q.enqueue.return_value = QueueItem(
            id="q-123",
            user_id="user-1",
            url="https://youtube.com/shorts/abc",
            status=QueueStatus.PENDING,
        )
        yield mock_q


@patch("backend.routes.extract.Client")
def test_extract_enqueues_and_starts_workflow(mock_client_cls, client, mock_queue, auth_headers):
    mock_client = AsyncMock()
    mock_client_cls.connect = AsyncMock(return_value=mock_client)
    mock_client.start_workflow = AsyncMock()

    resp = client.post("/api/extract", json={
        "url": "https://youtube.com/shorts/abc",
        "user_id": "user-1",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["queue_item"]["id"] == "q-123"
    assert data["message"] == "Extraction queued and processing started"


def test_extract_missing_url(client, auth_headers):
    resp = client.post("/api/extract", json={}, headers=auth_headers)
    assert resp.status_code == 422


def test_extract_requires_auth(client):
    resp = client.post("/api/extract", json={
        "url": "https://youtube.com/shorts/abc",
    })
    assert resp.status_code == 401
