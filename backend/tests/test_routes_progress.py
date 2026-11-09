import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.auth import create_token


@pytest.fixture
def auth_token():
    return create_token(username="testuser")


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@patch("backend.routes.progress.aioredis")
def test_progress_endpoint_exists(mock_aioredis, client, auth_token):
    # Make get_message return None once then raise CancelledError to stop the stream
    call_count = 0

    async def _get_message(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise asyncio.CancelledError()
        return None

    mock_pubsub = AsyncMock()
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.get_message = _get_message
    mock_pubsub.unsubscribe = AsyncMock()

    mock_client = MagicMock()
    mock_client.pubsub.return_value = mock_pubsub
    mock_client.aclose = AsyncMock()
    mock_aioredis.from_url.return_value = mock_client

    with client.stream("GET", f"/api/progress/user-1?token={auth_token}") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")


async def test_generator_emits_progress_event_and_cleans_up():
    from backend.routes.progress import _progress_generator

    msg = {"type": "message", "data": b'{"item_id": "q-1", "step": "download", "status": "running"}'}
    mock_pubsub = AsyncMock()
    mock_pubsub.get_message = AsyncMock(return_value=msg)
    mock_client = MagicMock()
    mock_client.pubsub.return_value = mock_pubsub
    mock_client.aclose = AsyncMock()

    with patch("backend.routes.progress.aioredis") as mock_aioredis:
        mock_aioredis.from_url.return_value = mock_client
        gen = _progress_generator("user-1")
        event = await anext(gen)
        await gen.aclose()  # what sse-starlette does on client disconnect

    assert event["event"] == "progress"
    assert '"item_id": "q-1"' in event["data"]
    mock_pubsub.subscribe.assert_awaited_once_with("progress:user-1")
    mock_pubsub.unsubscribe.assert_awaited_once_with("progress:user-1")
    mock_client.aclose.assert_awaited_once()
