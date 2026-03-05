import asyncio
import os
import sys

from temporalio.client import Client
from temporalio.worker import Worker
from temporalio.worker.workflow_sandbox import (
    SandboxedWorkflowRunner,
    SandboxRestrictions,
)

from backend.config import settings


def check_whisper_model():
    models_dir = os.environ.get("WHISPER_MODELS_DIR", "./data/whisper-models")
    model_path = os.path.join(models_dir, f"faster-whisper-{settings.whisper_model_size}")
    if not os.path.isdir(model_path):
        print(
            f"ERROR: Whisper model not found at {model_path}\n"
            f"Run 'python scripts/download-model.py {settings.whisper_model_size}' before starting the worker.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"Whisper model found: {model_path}")
from backend.workflows.extraction import (
    ExtractionWorkflow,
    download_activity,
    extract_activity,
    fail_queue_item_activity,
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
            fail_queue_item_activity,
        ],
        workflow_runner=SandboxedWorkflowRunner(
            restrictions=SandboxRestrictions.default.with_passthrough_modules(
                "backend",
            ),
        ),
    )
    print("Temporal worker started, listening on 'extraction-queue'")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_worker())
