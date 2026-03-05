from fastapi import APIRouter, Depends
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
    svc = SettingsService(session)
    svc.update_many(updates)
    return svc.get_all(mask_sensitive=True)
