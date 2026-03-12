from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from temporalio.client import Client

from backend.config import settings
from backend.dependencies import CurrentUser, get_current_user
from backend.routes.queue import QueueItemResponse, get_queue
from backend.services.queue import ExtractionQueue, QueueStatus
from backend.workflows.extraction import ExtractionWorkflow, ExtractionWorkflowInput

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

    # Start Temporal workflow
    try:
        client = await Client.connect(settings.temporal_host)
        await client.start_workflow(
            ExtractionWorkflow.run,
            ExtractionWorkflowInput(
                url=request.url,
                user_id=request.user_id,
                queue_item_id=item.id,
                forward_to_mealie=request.forward_to_mealie,
            ),
            id=f"extraction-{item.id}",
            task_queue="extraction-queue",
        )
    except Exception as e:
        queue.fail(item.id, request.user_id, str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start extraction: {e}")

    # Mark as in-progress so frontend shows pipeline visualization
    queue.mark_in_progress(item.id)
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
