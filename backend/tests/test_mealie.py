import json
from unittest.mock import patch

import httpx

from backend.services.mealie import MealieClient


async def test_forward_recipe_maps_ingredients_to_notes():
    put_body = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, json="pasta")
        if request.method == "GET":
            return httpx.Response(200, json={"id": "1"})
        put_body.update(json.loads(request.content))
        return httpx.Response(200, json={})

    real = httpx.AsyncClient
    with patch(
        "backend.services.mealie.httpx.AsyncClient",
        lambda **kw: real(transport=httpx.MockTransport(handler), **kw),
    ):
        slug = await MealieClient("http://mealie", "key").forward_recipe(
            {
                "title": "Pasta",
                "ingredients": [
                    {"name": "spaghetti", "quantity": "400", "unit": "g"},
                    {"name": "salt", "quantity": None, "unit": None},
                ],
                "instructions": ["Boil"],
            }
        )

    assert slug == "pasta"
    assert put_body["recipeIngredient"] == [{"note": "400 g spaghetti"}, {"note": "salt"}]
