from unittest.mock import MagicMock, patch

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
def mock_queue():
    with patch("backend.routes.queue.get_queue") as mock_get:
        mock_q = MagicMock()
        mock_get.return_value = mock_q
        yield mock_q


@pytest.fixture
def client():
    return TestClient(app)


def _make_item(id="q-123", status=QueueStatus.PENDING):
    return QueueItem(
        id=id,
        user_id="user-1",
        url="https://youtube.com/shorts/abc",
        status=status,
    )


def test_enqueue_single_url(client, mock_queue, auth_headers):
    mock_queue.enqueue.return_value = _make_item()

    resp = client.post("/api/queue", json={
        "urls": ["https://youtube.com/shorts/abc"],
        "user_id": "user-1",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1


def test_enqueue_multiple_urls(client, mock_queue, auth_headers):
    mock_queue.enqueue.side_effect = [
        _make_item(id="q-1"),
        _make_item(id="q-2"),
    ]

    resp = client.post("/api/queue", json={
        "urls": [
            "https://youtube.com/shorts/abc",
            "https://youtube.com/shorts/def",
        ],
        "user_id": "user-1",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 2


def test_list_queue(client, mock_queue, auth_headers):
    mock_queue.list_items.return_value = [_make_item()]

    resp = client.get("/api/queue/user-1", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 1


def test_cancel_queue_item(client, mock_queue, auth_headers):
    mock_queue.cancel.return_value = True

    resp = client.delete("/api/queue/user-1/q-123", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["cancelled"] is True


def test_cancel_non_pending_fails(client, mock_queue, auth_headers):
    mock_queue.cancel.return_value = False

    resp = client.delete("/api/queue/user-1/q-123", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["cancelled"] is False


def test_retry_failed_item(client, mock_queue, auth_headers):
    mock_queue.retry.return_value = True

    resp = client.post("/api/queue/user-1/q-123/retry", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["retried"] is True


def test_queue_requires_auth(client, mock_queue):
    resp = client.get("/api/queue/user-1")
    assert resp.status_code == 401
