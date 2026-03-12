import asyncio
import logging
import os
import sys

from temporalio.client import Client
from temporalio.worker import Worker
from temporalio.worker.workflow_sandbox import (
    SandboxedWorkflowRunner,
    SandboxRestrictions,
)

from backend.config import settings

logger = logging.getLogger(__name__)


def check_whisper_model():
    models_dir = os.environ.get("WHISPER_MODELS_DIR", "./data/whisper-models")
    model_path = os.path.join(models_dir, f"faster-whisper-{settings.whisper_model_size}")
    if not os.path.isdir(model_path):
        logger.error(
            "Whisper model not found at %s. "
            "Run 'python scripts/download-model.py %s' before starting the worker.",
            model_path, settings.whisper_model_size,
        )
        sys.exit(1)
    logger.info("Whisper model found: %s", model_path)
from backend.workflows.extraction import (
    ExtractionWorkflow,
    download_activity,
    extract_activity,
    fail_queue_item_activity,
    forward_to_mealie_activity,
    save_recipe_activity,
    transcribe_activity,
)


async def run_worker():
    check_whisper_model()
    client = await Client.connect(settings.temporal_host)
    worker = Worker(
        client,
        task_queue="extraction-queue",
        workflows=[ExtractionWorkflow],
        activities=[
            download_activity,
            transcribe_activity,
            extract_activity,
            save_recipe_activity,
            forward_to_mealie_activity,
            fail_queue_item_activity,
        ],
        workflow_runner=SandboxedWorkflowRunner(
            restrictions=SandboxRestrictions.default.with_passthrough_modules(
                "backend",
            ),
        ),
    )
    logger.info("Temporal worker started, listening on 'extraction-queue'")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_worker())
