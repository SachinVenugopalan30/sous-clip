from pydantic import BaseModel


class Ingredient(BaseModel):
    name: str
    quantity: str | None = None
    unit: str | None = None


class RecipeCreate(BaseModel):
    title: str
    source_url: str
    ingredients: list[Ingredient]
    instructions: list[str]
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags: list[str] = []
    notes: str | None = None


class RecipeResponse(BaseModel):
    id: int
    title: str
    source_url: str
    ingredients: list[Ingredient]
    instructions: list[str]
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags: list[str] = []
    notes: str | None = None
    created_at: str


class RecipeListResponse(BaseModel):
    recipes: list[RecipeResponse]
    total: int
