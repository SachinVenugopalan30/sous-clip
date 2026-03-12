from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from backend.database import get_session
from backend.dependencies import CurrentUser, get_current_user
from backend.services.settings import SettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings(
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    svc = SettingsService(session)
    return svc.get_all(mask_sensitive=True)


@router.put("")
def update_settings(
    updates: dict[str, str],
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    from backend.services.settings import SENSITIVE_KEYS

    # Don't overwrite real secrets with masked placeholder values
    filtered = {
        k: v for k, v in updates.items()
        if k not in SENSITIVE_KEYS or not v.startswith("••••••")
    }
    svc = SettingsService(session)
    svc.update_many(filtered)
    return svc.get_all(mask_sensitive=True)


class TestMealieRequest(BaseModel):
    mealie_url: str
    mealie_api_key: str


@router.post("/test-mealie")
async def test_mealie_connection(
    request: TestMealieRequest,
    _user: CurrentUser = Depends(get_current_user),
):
    from backend.services.mealie import MealieClient

    try:
        client = MealieClient(request.mealie_url, request.mealie_api_key)
        result = await client.test_connection()
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}
