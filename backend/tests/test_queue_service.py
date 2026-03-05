import json
from unittest.mock import MagicMock, patch

import pytest

from backend.services.queue import ExtractionQueue, QueueItem, QueueStatus


@pytest.fixture
def mock_redis():
    with patch("backend.services.queue.redis.Redis") as mock_cls:
        mock_client = MagicMock()
        mock_cls.from_url.return_value = mock_client
        yield mock_client


def test_queue_item_creation():
    item = QueueItem(
        id="q-123",
        user_id="user-1",
        url="https://youtube.com/shorts/abc",
        status=QueueStatus.PENDING,
    )
    assert item.id == "q-123"
    assert item.status == QueueStatus.PENDING


def test_enqueue_adds_item(mock_redis):
    queue = ExtractionQueue(redis_url="redis://localhost:6379/0")
    item = queue.enqueue(user_id="user-1", url="https://youtube.com/shorts/abc")

    assert item.user_id == "user-1"
    assert item.url == "https://youtube.com/shorts/abc"
    assert item.status == QueueStatus.PENDING
    assert item.id is not None

    # Should store item data and add to user's queue list
    assert mock_redis.hset.called
    assert mock_redis.rpush.called


def test_list_queue_items(mock_redis):
    queue = ExtractionQueue(redis_url="redis://localhost:6379/0")

    item_data = json.dumps({
        "id": "q-123",
        "user_id": "user-1",
        "url": "https://youtube.com/shorts/abc",
        "status": "pending",
        "position": 0,
        "created_at": "2026-03-03T00:00:00Z",
    })
    mock_redis.lrange.return_value = [b"q-123"]
    mock_redis.hget.return_value = item_data.encode()

    items = queue.list_items(user_id="user-1")
    assert len(items) == 1
    assert items[0].id == "q-123"


def test_cancel_pending_item(mock_redis):
    queue = ExtractionQueue(redis_url="redis://localhost:6379/0")

    item_data = json.dumps({
        "id": "q-123",
        "user_id": "user-1",
        "url": "https://youtube.com/shorts/abc",
        "status": "pending",
        "position": 0,
        "created_at": "2026-03-03T00:00:00Z",
    })
    mock_redis.hget.return_value = item_data.encode()

    result = queue.cancel(user_id="user-1", item_id="q-123")
    assert result is True


def test_cancel_in_progress_item_fails(mock_redis):
    queue = ExtractionQueue(redis_url="redis://localhost:6379/0")

    item_data = json.dumps({
        "id": "q-123",
        "user_id": "user-1",
        "url": "https://youtube.com/shorts/abc",
        "status": "in_progress",
        "position": 0,
        "created_at": "2026-03-03T00:00:00Z",
    })
    mock_redis.hget.return_value = item_data.encode()

    result = queue.cancel(user_id="user-1", item_id="q-123")
    assert result is False


def test_dequeue_returns_next_pending(mock_redis):
    queue = ExtractionQueue(redis_url="redis://localhost:6379/0")

    item_data = json.dumps({
        "id": "q-123",
        "user_id": "user-1",
        "url": "https://youtube.com/shorts/abc",
        "status": "pending",
        "position": 0,
        "created_at": "2026-03-03T00:00:00Z",
    })
    mock_redis.lrange.return_value = [b"q-123"]
    mock_redis.hget.return_value = item_data.encode()

    item = queue.dequeue(user_id="user-1")
    assert item is not None
    assert item.id == "q-123"
