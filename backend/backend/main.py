import logging
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from temporalio.client import Client
from temporalio.service import RPCError, RPCStatusCode

from backend.config import settings
from backend.database import create_db
from backend.telemetry import init_telemetry
from backend.routes.extract import router as extract_router
from backend.routes.progress import router as progress_router
from backend.routes.queue import router as queue_router
from backend.routes.auth import router as auth_router
from backend.routes.recipes import router as recipes_router
from backend.routes.settings import router as settings_router
from backend.services.queue import ExtractionQueue
from backend.workflows.extraction import ExtractionWorkflow, ExtractionWorkflowInput

logger = logging.getLogger(__name__)

async def recover_stuck_queue_items() -> None:
    """Reconcile Redis queue items with Temporal workflow state on startup."""
    try:
        queue = ExtractionQueue(settings.valkey_url)
        active_items = queue.get_all_active_items()
        if not active_items:
            return

        logger.info("Found %d active queue items, checking Temporal status...", len(active_items))
        client = await Client.connect(settings.temporal_host)

        for item in active_items:
            workflow_id = f"extraction-{item.id}"
            try:
                handle = client.get_workflow_handle(workflow_id)
                desc = await handle.describe()
                status = desc.status

                # WorkflowExecutionStatus: RUNNING=1, COMPLETED=2, FAILED=3, CANCELED=4, TERMINATED=5, TIMED_OUT=6
                if status == 2:  # COMPLETED
                    queue.complete(item.id, item.user_id)
                    logger.info("Recovered completed item %s", item.id)
                elif status in (3, 4, 5, 6):  # FAILED/CANCELED/TERMINATED/TIMED_OUT
                    queue.fail(item.id, item.user_id, f"Workflow {status.name.lower()} (recovered on restart)")
                    logger.info("Marked item %s as failed (workflow %s)", item.id, status.name)
                else:
                    # Still RUNNING — Temporal will resume it when worker reconnects
                    logger.info("Item %s workflow still running, will resume", item.id)

            except RPCError as e:
                if e.status == RPCStatusCode.NOT_FOUND:
                    # Workflow doesn't exist in Temporal — re-submit it
                    logger.info("Re-submitting lost workflow for item %s", item.id)
                    try:
                        await client.start_workflow(
                            ExtractionWorkflow.run,
                            ExtractionWorkflowInput(
                                url=item.url,
                                user_id=item.user_id,
                                queue_item_id=item.id,
                            ),
                            id=workflow_id,
                            task_queue="extraction-queue",
                        )
                    except Exception as start_err:
                        queue.fail(item.id, item.user_id, f"Failed to restart: {start_err}")
                        logger.error("Failed to re-submit workflow for %s: %s", item.id, start_err)
                else:
                    logger.error("RPC error checking workflow %s: %s", workflow_id, e)
            except Exception as e:
                logger.error("Error recovering item %s: %s", item.id, e)

    except Exception as e:
        logger.warning("Queue recovery skipped (Temporal may not be ready): %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    await recover_stuck_queue_items()
    yield


app = FastAPI(
    title="Sous Clip",
    description="Self-hosted recipe extractor for short-form cooking videos",
    version="0.1.0",
    lifespan=lifespan,
)

init_telemetry()

if settings.otel_enabled:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    FastAPIInstrumentor.instrument_app(app)

app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(extract_router)
app.include_router(progress_router)
app.include_router(queue_router)
app.include_router(settings_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files in production
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")
    app.mount("/icons", StaticFiles(directory=os.path.join(_static_dir, "icons")), name="icons")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(_static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_static_dir, "index.html"))
