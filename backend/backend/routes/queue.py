from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from temporalio.client import Client

from backend.config import settings
from backend.dependencies import CurrentUser, get_current_user
from backend.services.queue import ExtractionQueue, QueueItem
from backend.workflows.extraction import ExtractionWorkflow, ExtractionWorkflowInput

router = APIRouter(prefix="/api/queue", tags=["queue"])


def get_queue() -> ExtractionQueue:
    return ExtractionQueue(redis_url=settings.valkey_url)


async def start_extraction(queue: ExtractionQueue, item: QueueItem, forward_to_mealie: bool = False) -> None:
    """Start the Temporal workflow for a queue item and mark it in progress."""
    try:
        client = await Client.connect(settings.temporal_host)
        await client.start_workflow(
            ExtractionWorkflow.run,
            ExtractionWorkflowInput(
                url=item.url,
                user_id=item.user_id,
                queue_item_id=item.id,
                forward_to_mealie=forward_to_mealie,
            ),
            id=f"extraction-{item.id}",  # a closed (failed) run with this id may be reused
            task_queue="extraction-queue",
        )
    except Exception as e:
        queue.fail(item.id, item.user_id, str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start extraction: {e}")
    queue.mark_in_progress(item.id)


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
async def retry_item(user_id: str, item_id: str, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()
    item = queue.retry(user_id=user_id, item_id=item_id)
    if item:
        # ponytail: forward_to_mealie isn't stored on the item, so a retry doesn't re-forward; send from the library
        await start_extraction(queue, item)
    return {"retried": item is not None}
