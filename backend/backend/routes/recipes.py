import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.database import get_session
from backend.dependencies import CurrentUser, get_current_user
from backend.models import Recipe
from backend.schemas import Ingredient, RecipeListResponse, RecipeResponse

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _recipe_to_response(recipe: Recipe) -> RecipeResponse:
    return RecipeResponse(
        id=recipe.id,
        title=recipe.title,
        source_url=recipe.source_url,
        ingredients=[Ingredient(**i) for i in json.loads(recipe.ingredients_json)],
        instructions=json.loads(recipe.instructions_json),
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        servings=recipe.servings,
        tags=json.loads(recipe.tags_json),
        notes=recipe.notes,
        created_at=recipe.created_at.isoformat(),
    )


@router.get("", response_model=RecipeListResponse)
def list_recipes(
    search: str | None = Query(None),
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    statement = select(Recipe)
    if search:
        pattern = f"%{search}%"
        statement = statement.where(
            Recipe.title.ilike(pattern) | Recipe.ingredients_json.ilike(pattern)
        )
    statement = statement.order_by(Recipe.created_at.desc())
    recipes = session.exec(statement).all()
    return RecipeListResponse(
        recipes=[_recipe_to_response(r) for r in recipes],
        total=len(recipes),
    )


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int, session: Session = Depends(get_session), _user: CurrentUser = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _recipe_to_response(recipe)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session), _user: CurrentUser = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    session.delete(recipe)
    session.commit()


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/bulk-delete")
def bulk_delete_recipes(
    body: BulkDeleteRequest,
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    statement = select(Recipe).where(Recipe.id.in_(body.ids))
    recipes = session.exec(statement).all()
    count = len(recipes)
    for recipe in recipes:
        session.delete(recipe)
    session.commit()
    return {"deleted": count}
