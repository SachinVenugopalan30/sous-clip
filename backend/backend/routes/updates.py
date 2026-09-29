from fastapi import APIRouter, Depends
from sqlmodel import Session

from backend.config import settings
from backend.database import get_session
from backend.dependencies import CurrentUser, get_current_user
from backend.services.settings import SettingsService
from backend.services.updates import latest_release, parse_version, trigger_update, watchtower_reachable

router = APIRouter(prefix="/api/update", tags=["update"])


@router.get("")
async def update_status(
    session: Session = Depends(get_session),
    _user: CurrentUser = Depends(get_current_user),
):
    current = settings.app_version
    check_enabled = SettingsService(session).get("update_check") != "false"
    latest = await latest_release() if check_enabled and current != "dev" else None
    current_v, latest_v = parse_version(current), parse_version(latest)
    return {
        "current": current,
        "latest": latest,
        "update_available": bool(current_v and latest_v and latest_v > current_v),
        "watchtower": await watchtower_reachable(),
    }


# Any logged-in user can restart the app; fine for a single-user install
@router.post("")
async def start_update(_user: CurrentUser = Depends(get_current_user)):
    return await trigger_update()
