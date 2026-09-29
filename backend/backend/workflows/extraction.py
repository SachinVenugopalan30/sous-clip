import json
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from temporalio import activity, workflow
from temporalio.common import RetryPolicy

from backend.config import settings
from backend.services.downloader import Downloader
from backend.services.errors import describe_failure
from backend.services.extractor import RecipeExtractor
from backend.services.queue import ExtractionQueue
from backend.services.transcriber import Transcriber
from backend.telemetry import get_tracer

tracer = get_tracer("extraction-pipeline")

# ponytail: flat 3 attempts per step; mark permanent errors non_retryable if retries waste time.
RETRY = RetryPolicy(maximum_attempts=3)


def _get_queue() -> ExtractionQueue:
    return ExtractionQueue(settings.valkey_url)


def _app_settings() -> dict[str, str]:
    """Settings saved in the UI, falling back to env defaults."""
    from backend.database import engine
    from backend.services.settings import SettingsService
    from sqlmodel import Session

    with Session(engine) as session:
        return SettingsService(session).get_all()


@dataclass
class ExtractionWorkflowInput:
    url: str
    user_id: str
    queue_item_id: str
    forward_to_mealie: bool = False


@activity.defn
async def download_activity(url: str, user_id: str, queue_item_id: str) -> dict:
    with tracer.start_as_current_span("pipeline.download", attributes={"url": url}):
        queue = _get_queue()
        queue.mark_in_progress(queue_item_id)
        queue.publish_progress(user_id, queue_item_id, "downloading", "active", percent=0)

        def on_progress(percent: int) -> None:
            queue.publish_progress(user_id, queue_item_id, "downloading", "active", percent=percent)

        downloader = Downloader(media_dir=settings.media_dir)
        result = downloader.download(url, progress_hook=on_progress)

        # Publish video metadata now that we have it
        meta = {"title": result.title}
        if result.channel:
            meta["channel"] = result.channel
        if result.duration is not None:
            meta["duration"] = result.duration
        if result.thumbnail:
            meta["thumbnail"] = result.thumbnail
        queue.publish_progress(
            user_id, queue_item_id, "downloading", "complete", percent=100, meta=meta,
        )

        return {
            "audio_path": result.audio_path,
            "title": result.title,
            "channel": result.channel,
            "duration": result.duration,
            "caption": result.caption,
            "thumbnail_path": result.thumbnail_path,
        }


@activity.defn
async def transcribe_activity(audio_path: str, user_id: str, queue_item_id: str) -> dict:
    cfg = _app_settings()
    with tracer.start_as_current_span("pipeline.transcribe", attributes={
        "model_size": cfg["whisper_model_size"],
        "device": cfg["whisper_device"],
    }):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "transcribing", "active")

        transcriber = Transcriber(
            model_size=cfg["whisper_model_size"],
            device=cfg["whisper_device"],
            compute_type=cfg["whisper_compute_type"],
        )
        result = transcriber.transcribe(audio_path)
        Path(audio_path).unlink(missing_ok=True)  # audio is only needed for transcription
        return {"text": result.text, "language": result.language}


@activity.defn
async def extract_activity(transcript: str, user_id: str, queue_item_id: str, caption: str = "") -> dict:
    cfg = _app_settings()
    provider = cfg["ai_provider"]
    with tracer.start_as_current_span("pipeline.ai_extract", attributes={
        "provider": provider,
        "model": cfg["ai_model"],
    }):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "extracting", "active")

        extractor = RecipeExtractor(
            provider=provider,
            api_key=cfg.get(f"{provider}_api_key", ""),
            model=cfg["ai_model"],
            base_url={"ollama": cfg["ollama_base_url"], "custom": cfg["custom_base_url"]}.get(provider),
            api_style=cfg["custom_api_style"],
        )
        result = await extractor.extract(transcript, caption)
        return {
            "title": result.title,
            "ingredients": [i.model_dump() for i in result.ingredients],
            "instructions": result.instructions,
            "prep_time_minutes": result.prep_time_minutes,
            "cook_time_minutes": result.cook_time_minutes,
            "servings": result.servings,
            "notes": result.notes,
            "tags": result.tags,
        }


@activity.defn
async def save_recipe_activity(
    url: str, transcript: str, extraction_data: dict, user_id: str, queue_item_id: str,
    thumbnail_path: str | None = None,
) -> int:
    with tracer.start_as_current_span("pipeline.save"):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "saved", "active")

        import secrets
        import shutil

        from backend.database import engine
        from backend.models import Recipe
        from sqlmodel import Session, select

        with Session(engine) as session:
            # A retry after a successful commit must not insert a second recipe
            existing = session.exec(select(Recipe).where(Recipe.queue_item_id == queue_item_id)).first()
            recipe_id = existing.id if existing else None

        if recipe_id is None:
            thumbnail = None
            if thumbnail_path and Path(thumbnail_path).exists():
                # Copy, commit, then unlink: a failed commit never leaves a dangling reference
                thumbnail = secrets.token_urlsafe(12) + Path(thumbnail_path).suffix
                Path(settings.thumbnails_dir).mkdir(parents=True, exist_ok=True)
                shutil.copyfile(thumbnail_path, Path(settings.thumbnails_dir) / thumbnail)
            recipe = Recipe(
                title=extraction_data["title"],
                source_url=url,
                ingredients_json=json.dumps(extraction_data["ingredients"]),
                instructions_json=json.dumps(extraction_data["instructions"]),
                prep_time_minutes=extraction_data.get("prep_time_minutes"),
                cook_time_minutes=extraction_data.get("cook_time_minutes"),
                servings=extraction_data.get("servings"),
                notes=extraction_data.get("notes"),
                tags_json=json.dumps(extraction_data.get("tags", [])),
                transcript=transcript,
                queue_item_id=queue_item_id,
                thumbnail=thumbnail,
            )
            with Session(engine) as session:
                session.add(recipe)
                session.commit()
                recipe_id = recipe.id
        if thumbnail_path:
            Path(thumbnail_path).unlink(missing_ok=True)

        # Mark queue item completed and publish final event
        queue.complete(queue_item_id, user_id)
        queue.publish_progress(user_id, queue_item_id, "saved", "complete")

        return recipe_id


@activity.defn
async def forward_to_mealie_activity(
    extraction_data: dict, source_url: str, user_id: str, queue_item_id: str,
    forward_to_mealie: bool,
) -> None:
    if not forward_to_mealie:
        return

    from backend.services.mealie import MealieClient

    cfg = _app_settings()
    mealie_url = cfg["mealie_url"]
    mealie_api_key = cfg["mealie_api_key"]

    if not mealie_url or not mealie_api_key:
        return

    queue = _get_queue()
    queue.publish_progress(user_id, queue_item_id, "mealie", "active")

    try:
        client = MealieClient(mealie_url, mealie_api_key)
        await client.forward_recipe(extraction_data, source_url)
        queue.publish_progress(user_id, queue_item_id, "mealie", "complete")
    except Exception as e:
        queue.publish_progress(user_id, queue_item_id, "mealie", "error")
        activity.logger.warning(f"Mealie forwarding failed: {e}")


@activity.defn
async def fail_queue_item_activity(user_id: str, queue_item_id: str, error: str) -> None:
    queue = _get_queue()
    queue.fail(queue_item_id, user_id, error)
    queue.publish_progress(user_id, queue_item_id, "error", "error")


@workflow.defn
class ExtractionWorkflow:
    @workflow.run
    async def run(self, input: ExtractionWorkflowInput) -> int:
        user_id = input.user_id
        item_id = input.queue_item_id
        step = "Download"  # named in the queue's error message if this step fails

        try:
            # Step 1: Download
            download_result = await workflow.execute_activity(
                download_activity,
                args=[input.url, user_id, item_id],
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RETRY,
            )

            # Step 2: Transcribe
            step = "Transcription"
            transcribe_result = await workflow.execute_activity(
                transcribe_activity,
                args=[download_result["audio_path"], user_id, item_id],
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=RETRY,
            )

            # Step 3: Extract recipe via AI
            step = "AI extraction"
            extraction_data = await workflow.execute_activity(
                extract_activity,
                # .get: histories recorded before v1.3.0 have no caption
                args=[transcribe_result["text"], user_id, item_id, download_result.get("caption", "")],
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=RETRY,
            )

            # Step 4: Save to database
            step = "Saving the recipe"
            recipe_id = await workflow.execute_activity(
                save_recipe_activity,
                args=[
                    input.url, transcribe_result["text"], extraction_data, user_id, item_id,
                    download_result.get("thumbnail_path"),
                ],
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RETRY,
            )

            # Step 5: Forward to Mealie (non-blocking)
            try:
                await workflow.execute_activity(
                    forward_to_mealie_activity,
                    args=[extraction_data, input.url, user_id, item_id, input.forward_to_mealie],
                    start_to_close_timeout=timedelta(seconds=30),
                )
            except Exception:
                pass  # Mealie failure must not fail the workflow

            return recipe_id
        except Exception as e:
            # Mark the queue item as failed so the UI reflects the error
            await workflow.execute_activity(
                fail_queue_item_activity,
                args=[user_id, item_id, describe_failure(step, e)],
                start_to_close_timeout=timedelta(seconds=10),
            )
            raise
