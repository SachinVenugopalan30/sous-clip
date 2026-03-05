import json

from sqlmodel import Session

from backend.models import Recipe


def test_create_recipe(db_session: Session):
    recipe = Recipe(
        title="Garlic Butter Pasta",
        source_url="https://youtube.com/shorts/abc123",
        ingredients_json=json.dumps([
            {"name": "spaghetti", "quantity": "400", "unit": "g"},
            {"name": "garlic", "quantity": "4", "unit": "cloves"},
            {"name": "butter", "quantity": "50", "unit": "g"},
        ]),
        instructions_json=json.dumps([
            "Boil pasta until al dente",
            "Melt butter, sauté garlic",
            "Toss pasta in garlic butter",
        ]),
        prep_time_minutes=5,
        cook_time_minutes=15,
        servings=4,
        tags_json=json.dumps(["quick", "pasta"]),
        notes="Add chili flakes for heat",
        transcript="today we're making garlic butter pasta...",
    )
    db_session.add(recipe)
    db_session.commit()
    db_session.refresh(recipe)

    assert recipe.id is not None
    assert recipe.title == "Garlic Butter Pasta"
    assert json.loads(recipe.ingredients_json) == [
        {"name": "spaghetti", "quantity": "400", "unit": "g"},
        {"name": "garlic", "quantity": "4", "unit": "cloves"},
        {"name": "butter", "quantity": "50", "unit": "g"},
    ]


def test_recipe_defaults(db_session: Session):
    recipe = Recipe(
        title="Quick Toast",
        source_url="https://tiktok.com/@user/video/123",
        ingredients_json=json.dumps([{"name": "bread", "quantity": "2", "unit": "slices"}]),
        instructions_json=json.dumps(["Toast the bread"]),
    )
    db_session.add(recipe)
    db_session.commit()
    db_session.refresh(recipe)

    assert recipe.prep_time_minutes is None
    assert recipe.cook_time_minutes is None
    assert recipe.servings is None
    assert recipe.tags_json == "[]"
    assert recipe.notes is None
    assert recipe.created_at is not None
