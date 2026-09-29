from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.dependencies import CurrentUser, get_current_user
from backend.routes.queue import QueueItemResponse, get_queue, start_extraction
from backend.services.queue import QueueStatus

router = APIRouter(prefix="/api", tags=["extract"])


class ExtractRequest(BaseModel):
    url: str
    user_id: str = "default"
    forward_to_mealie: bool = False


class ExtractResponse(BaseModel):
    queue_item: QueueItemResponse
    message: str


@router.post("/extract", response_model=ExtractResponse)
async def extract_recipe(request: ExtractRequest, _user: CurrentUser = Depends(get_current_user)):
    queue = get_queue()

    # Enqueue the URL
    item = queue.enqueue(user_id=request.user_id, url=request.url)

    # Starts the Temporal workflow and marks the item in progress (frontend shows the pipeline)
    await start_extraction(queue, item, request.forward_to_mealie)
    item.status = QueueStatus.IN_PROGRESS

    return ExtractResponse(
        queue_item=QueueItemResponse(
            id=item.id,
            user_id=item.user_id,
            url=item.url,
            status=item.status.value,
            position=item.position,
            created_at=item.created_at,
            error=item.error,
        ),
        message="Extraction queued and processing started",
    )
