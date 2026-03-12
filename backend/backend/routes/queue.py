from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.config import settings
from backend.dependencies import CurrentUser, get_current_user
from backend.services.queue import ExtractionQueue

router = APIRouter(prefix="/api/queue", tags=["queue"])


def get_queue() -> ExtractionQueue:
    return ExtractionQueue(redis_url=settings.valkey_url)


class EnqueueRequest(BaseModel):
    urls: list[str]
    user_id: str
    forward_to_mealie: bool = False


class QueueItemResponse(BaseModel):
    id: str
    user_id: str
    url: str
    status: str
    position: int
    created_at: str
    error: str | None = None


class QueueListResponse(BaseModel):
    items: list[QueueItemResponse]


@router.post("", response_model=QueueListResponse)
def enqueue_urls(request: EnqueueRequest, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()
    items = []
    for url in request.urls:
        item = queue.enqueue(user_id=request.user_id, url=url)
        items.append(QueueItemResponse(
            id=item.id,
            user_id=item.user_id,
            url=item.url,
            status=item.status.value,
            position=item.position,
            created_at=item.created_at,
            error=item.error,
        ))
    return QueueListResponse(items=items)


@router.get("/{user_id}", response_model=QueueListResponse)
def list_queue(user_id: str, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()
    items = queue.list_items(user_id=user_id)
    return QueueListResponse(items=[
        QueueItemResponse(
            id=item.id,
            user_id=item.user_id,
            url=item.url,
            status=item.status.value,
            position=item.position,
            created_at=item.created_at,
            error=item.error,
        )
        for item in items
    ])


@router.delete("/{user_id}/{item_id}")
def cancel_item(user_id: str, item_id: str, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()
    result = queue.cancel(user_id=user_id, item_id=item_id)
    return {"cancelled": result}


@router.post("/{user_id}/{item_id}/retry")
def retry_item(user_id: str, item_id: str, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()
    result = queue.retry(user_id=user_id, item_id=item_id)
    return {"retried": result}
