import json

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from backend.main import app
from backend.database import get_session
from backend.models import Recipe
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


@pytest.fixture
def seeded_db(test_db):
    with Session(test_db) as session:
        recipe = Recipe(
            title="Garlic Butter Pasta",
            source_url="https://youtube.com/shorts/abc123",
            ingredients_json=json.dumps([
                {"name": "pasta", "quantity": "400", "unit": "g"},
            ]),
            instructions_json=json.dumps(["Boil pasta", "Make sauce"]),
            prep_time_minutes=5,
            cook_time_minutes=15,
            servings=4,
            tags_json=json.dumps(["pasta", "quick"]),
        )
        session.add(recipe)
        session.commit()


def test_list_recipes_empty(client, auth_headers):
    response = client.get("/api/recipes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["recipes"] == []
    assert data["total"] == 0


def test_list_recipes_with_data(client, seeded_db, auth_headers):
    response = client.get("/api/recipes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["recipes"][0]["title"] == "Garlic Butter Pasta"
    assert len(data["recipes"][0]["ingredients"]) == 1


def test_get_recipe_by_id(client, seeded_db, auth_headers):
    response = client.get("/api/recipes/1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Garlic Butter Pasta"
    assert data["servings"] == 4


def test_get_recipe_not_found(client, auth_headers):
    response = client.get("/api/recipes/999", headers=auth_headers)
    assert response.status_code == 404


def test_delete_recipe(client, seeded_db, auth_headers):
    response = client.delete("/api/recipes/1", headers=auth_headers)
    assert response.status_code == 204

    response = client.get("/api/recipes/1", headers=auth_headers)
    assert response.status_code == 404


def test_search_recipes(client, seeded_db, auth_headers):
    response = client.get("/api/recipes?search=garlic", headers=auth_headers)
    data = response.json()
    assert data["total"] == 1

    response = client.get("/api/recipes?search=nonexistent", headers=auth_headers)
    data = response.json()
    assert data["total"] == 0


def test_list_recipes_requires_auth(client):
    response = client.get("/api/recipes")
    assert response.status_code == 401


@pytest.fixture
def thumb_recipe(test_db, tmp_path, monkeypatch):
    from backend.config import settings
    monkeypatch.setattr(settings, "thumbnails_dir", str(tmp_path))
    thumb = tmp_path / "abc.webp"
    thumb.write_bytes(b"img")
    with Session(test_db) as session:
        recipe = Recipe(title="T", source_url="u", ingredients_json="[]", instructions_json="[]", thumbnail="abc.webp")
        session.add(recipe)
        session.commit()
        return recipe.id, thumb


def test_recipe_response_includes_thumbnail_url(client, auth_headers, thumb_recipe):
    recipe_id, _ = thumb_recipe
    assert client.get(f"/api/recipes/{recipe_id}", headers=auth_headers).json()["thumbnail_url"] == "/thumbnails/abc.webp"


@pytest.mark.parametrize("bulk", [False, True], ids=["single", "bulk"])
def test_delete_removes_thumbnail_file(client, auth_headers, thumb_recipe, bulk):
    recipe_id, thumb = thumb_recipe
    if bulk:
        client.post("/api/recipes/bulk-delete", json={"ids": [recipe_id]}, headers=auth_headers)
    else:
        client.delete(f"/api/recipes/{recipe_id}", headers=auth_headers)
    assert not thumb.exists()


def test_thumbnails_are_served_on_fresh_install(client):
    from pathlib import Path
    from backend.config import settings
    served = Path(settings.thumbnails_dir) / "test-served.webp"  # dir must exist before any extraction
    served.write_bytes(b"img")
    try:
        response = client.get("/thumbnails/test-served.webp")
        assert response.status_code == 200 and response.content == b"img"
    finally:
        served.unlink()


def test_patch_updates_only_sent_fields(client, seeded_db, auth_headers, test_db):
    salt = [{"name": "salt", "quantity": "1", "unit": "tsp"}]
    response = client.patch("/api/recipes/1", json={"title": "New", "ingredients": salt, "servings": None}, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert (body["title"], body["ingredients"], body["servings"]) == ("New", salt, None)
    assert body["instructions"] == ["Boil pasta", "Make sauce"] and body["tags"] == ["pasta", "quick"]
    with Session(test_db) as session:
        recipe = session.get(Recipe, 1)
        assert recipe.updated_at > recipe.created_at


@pytest.mark.parametrize("payload, status", [({}, 400), ({"title": None}, 422)], ids=["empty", "null-title"])
def test_patch_rejects_bad_bodies(client, seeded_db, auth_headers, payload, status):
    assert client.patch("/api/recipes/1", json=payload, headers=auth_headers).status_code == status


def test_patch_missing_recipe(client, test_db, auth_headers):
    assert client.patch("/api/recipes/999", json={"title": "x"}, headers=auth_headers).status_code == 404
