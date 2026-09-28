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


class RecipeUpdate(BaseModel):
    # NOT NULL columns: omitted is fine (defaults aren't validated), explicit null is a 422
    title: str = None
    ingredients: list[Ingredient] = None
    instructions: list[str] = None
    tags: list[str] = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
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
    share_token: str | None = None
    thumbnail_url: str | None = None
    created_at: str


class RecipeListResponse(BaseModel):
    recipes: list[RecipeResponse]
    total: int
