import httpx


class MealieClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def forward_recipe(self, recipe_data: dict, source_url: str = "") -> str:
        """Create then update a recipe in Mealie. Returns the slug."""
        title = recipe_data.get("title", "Untitled Recipe")

        async with httpx.AsyncClient(timeout=30) as client:
            # Create a stub to get the slug
            create_resp = await client.post(
                f"{self.base_url}/api/recipes",
                json={"name": title},
                headers=self.headers,
            )
            create_resp.raise_for_status()
            slug = create_resp.json()

            # Fetch the full recipe Mealie created
            get_resp = await client.get(
                f"{self.base_url}/api/recipes/{slug}",
                headers=self.headers,
            )
            get_resp.raise_for_status()
            full_recipe = get_resp.json()

            # Carry over only safe top-level fields; others make Mealie answer 400/422/500
            CARRY_OVER = {
                "id", "slug", "userId", "groupId", "householdId",
                "recipeCategory", "tags", "tools", "dateAdded", "dateUpdated",
                "createdAt", "updateAt",
            }
            full_recipe = {k: v for k, v in full_recipe.items() if k in CARRY_OVER}

            ingredients = recipe_data.get("ingredients", [])
            recipe_ingredient = []
            for ing in ingredients:
                parts = []
                if ing.get("quantity"):
                    parts.append(str(ing["quantity"]))
                if ing.get("unit"):
                    parts.append(ing["unit"])
                parts.append(ing.get("name", ""))
                recipe_ingredient.append({"note": " ".join(parts)})

            instructions = recipe_data.get("instructions", [])
            recipe_instructions = [{"text": step} for step in instructions]

            full_recipe["name"] = title
            full_recipe["slug"] = slug
            full_recipe["recipeIngredient"] = recipe_ingredient
            full_recipe["recipeInstructions"] = recipe_instructions
            full_recipe["recipeYield"] = str(recipe_data["servings"]) if recipe_data.get("servings") else ""
            full_recipe["prepTime"] = f"PT{recipe_data['prep_time_minutes']}M" if recipe_data.get("prep_time_minutes") else ""
            full_recipe["performTime"] = f"PT{recipe_data['cook_time_minutes']}M" if recipe_data.get("cook_time_minutes") else ""
            full_recipe["orgURL"] = source_url
            full_recipe["notes"] = [{"title": "Notes", "text": recipe_data["notes"]}] if recipe_data.get("notes") else []
            full_recipe["settings"] = full_recipe.get("settings", {})

            put_resp = await client.put(
                f"{self.base_url}/api/recipes/{slug}",
                json=full_recipe,
                headers=self.headers,
            )
            if put_resp.status_code in (400, 422, 500):
                body = put_resp.text
                raise httpx.HTTPStatusError(
                    f"{put_resp.status_code}: {body}",
                    request=put_resp.request,
                    response=put_resp,
                )
            put_resp.raise_for_status()

            return slug

    async def test_connection(self) -> dict:
        """Check Mealie is reachable (/api/app/about)."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{self.base_url}/api/app/about",
                headers=self.headers,
            )
            resp.raise_for_status()
            data = resp.json()
            return {"ok": True, "version": data.get("version", "unknown")}
