from backend.schemas import Ingredient, RecipeResponse


def test_ingredient_valid():
    i = Ingredient(name="garlic", quantity="4", unit="cloves")
    assert i.name == "garlic"
    assert i.quantity == "4"
    assert i.unit == "cloves"


def test_ingredient_optional_fields():
    i = Ingredient(name="salt")
    assert i.quantity is None
    assert i.unit is None


def test_recipe_response_from_model():
    resp = RecipeResponse(
        id=1,
        title="Pasta",
        source_url="https://youtube.com/shorts/abc",
        ingredients=[Ingredient(name="pasta", quantity="400", unit="g")],
        instructions=["Boil pasta"],
        prep_time_minutes=None,
        cook_time_minutes=None,
        servings=None,
        tags=[],
        notes=None,
        created_at="2026-03-03T00:00:00Z",
    )
    assert resp.id == 1
    assert resp.ingredients[0].name == "pasta"
