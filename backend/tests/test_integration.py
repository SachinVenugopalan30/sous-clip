"""
End-to-end integration test that verifies the queue-based extraction flow
with mocked external services.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import json
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from backend.main import app
from backend.database import get_session
from backend.models import Recipe
from backend.services.auth import create_token
from backend.services.queue import QueueItem, QueueStatus


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


@pytest.fixture
def mock_queue():
    with patch("backend.routes.extract.get_queue") as mock_get:
        mock_q = MagicMock()
        mock_get.return_value = mock_q
        mock_q.enqueue.return_value = QueueItem(
            id="q-int-123",
            user_id="default",
            url="https://youtube.com/shorts/test",
            status=QueueStatus.PENDING,
        )
        yield mock_q


@patch("backend.routes.extract.Client")
def test_extract_then_list_recipes(mock_client_cls, client, mock_queue, test_db, auth_headers):
    # Mock Temporal client
    mock_client = AsyncMock()
    mock_client_cls.connect = AsyncMock(return_value=mock_client)
    mock_client.start_workflow = AsyncMock()

    # 1. Submit extraction - now returns queue item, not recipe
    resp = client.post("/api/extract", json={"url": "https://youtube.com/shorts/test"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["queue_item"]["id"] == "q-int-123"
    assert resp.json()["message"] == "Extraction queued and processing started"

    # 2. Manually seed a recipe (since workflow runs async via Temporal)
    with Session(test_db) as session:
        recipe = Recipe(
            title="Integration Pasta",
            source_url="https://youtube.com/shorts/test",
            ingredients_json=json.dumps([{"name": "pasta", "quantity": "500", "unit": "g"}]),
            instructions_json=json.dumps(["Boil", "Serve"]),
        )
        session.add(recipe)
        session.commit()
        session.refresh(recipe)
        recipe_id = recipe.id

    # 3. List recipes
    resp = client.get("/api/recipes", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    # 4. Get by ID
    resp = client.get(f"/api/recipes/{recipe_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Integration Pasta"

    # 5. Search
    resp = client.get("/api/recipes?search=pasta", headers=auth_headers)
    assert resp.json()["total"] == 1

    # 6. Delete
    resp = client.delete(f"/api/recipes/{recipe_id}", headers=auth_headers)
    assert resp.status_code == 204

    resp = client.get(f"/api/recipes/{recipe_id}", headers=auth_headers)
    assert resp.status_code == 404
