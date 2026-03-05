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
