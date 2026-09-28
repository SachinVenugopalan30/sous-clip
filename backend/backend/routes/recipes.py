import json
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.config import settings
from backend.database import get_session
from backend.dependencies import CurrentUser, get_current_user
from backend.models import Recipe
from backend.schemas import Ingredient, RecipeListResponse, RecipeResponse, RecipeUpdate
from backend.services.mealie import MealieClient
from backend.services.settings import SettingsService

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
        share_token=recipe.share_token,
        thumbnail_url=f"/thumbnails/{recipe.thumbnail}" if recipe.thumbnail else None,
        created_at=recipe.created_at.isoformat(),
    )


def _delete_recipe(session: Session, recipe: Recipe) -> None:
    if recipe.thumbnail:
        Path(settings.thumbnails_dir, recipe.thumbnail).unlink(missing_ok=True)
    session.delete(recipe)


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


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    body: RecipeUpdate,
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    for key, value in changes.items():
        if key in ("ingredients", "instructions", "tags"):
            setattr(recipe, f"{key}_json", json.dumps(value))
        else:
            setattr(recipe, key, value)
    recipe.updated_at = datetime.now(timezone.utc)
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return _recipe_to_response(recipe)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session), _user: CurrentUser = Depends(get_current_user)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    _delete_recipe(session, recipe)
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
        _delete_recipe(session, recipe)
    session.commit()
    return {"deleted": count}


@router.post("/{recipe_id}/share")
def share_recipe(
    recipe_id: int,
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if not recipe.share_token:
        recipe.share_token = secrets.token_urlsafe(16)
        session.add(recipe)
        session.commit()
        session.refresh(recipe)
    return {"share_token": recipe.share_token, "share_url": f"/share/{recipe.share_token}"}


@router.post("/{recipe_id}/send-to-mealie")
async def send_to_mealie(
    recipe_id: int,
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    svc = SettingsService(session)
    mealie_url = svc.get("mealie_url", "")
    mealie_api_key = svc.get("mealie_api_key", "")

    if not mealie_url or not mealie_api_key:
        return {"ok": False, "error": "Mealie not configured"}

    recipe_data = {
        "title": recipe.title,
        "ingredients": json.loads(recipe.ingredients_json),
        "instructions": json.loads(recipe.instructions_json),
        "prep_time_minutes": recipe.prep_time_minutes,
        "cook_time_minutes": recipe.cook_time_minutes,
        "servings": recipe.servings,
        "notes": recipe.notes,
    }

    try:
        client = MealieClient(mealie_url, mealie_api_key)
        slug = await client.forward_recipe(recipe_data, recipe.source_url or "")
        return {"ok": True, "slug": slug}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.delete("/{recipe_id}/share", status_code=204)
def unshare_recipe(
    recipe_id: int,
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    recipe.share_token = None
    session.add(recipe)
    session.commit()


# Separate router for public share access (no auth)
share_router = APIRouter(prefix="/api/share", tags=["share"])


@share_router.get("/{token}", response_model=RecipeResponse)
def get_shared_recipe(token: str, session: Session = Depends(get_session)):
    recipe = session.exec(select(Recipe).where(Recipe.share_token == token)).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Shared recipe not found")
    return _recipe_to_response(recipe)
