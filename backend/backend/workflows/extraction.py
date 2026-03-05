import json
from dataclasses import dataclass
from datetime import timedelta

from temporalio import activity, workflow

from backend.config import settings
from backend.services.downloader import Downloader
from backend.services.extractor import RecipeExtractor
from backend.services.queue import ExtractionQueue
from backend.services.transcriber import Transcriber
from backend.telemetry import get_tracer

tracer = get_tracer("extraction-pipeline")


def _get_queue() -> ExtractionQueue:
    return ExtractionQueue(settings.valkey_url)


@dataclass
class ExtractionWorkflowInput:
    url: str
    user_id: str
    queue_item_id: str


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
        }


@activity.defn
async def transcribe_activity(audio_path: str, user_id: str, queue_item_id: str) -> dict:
    with tracer.start_as_current_span("pipeline.transcribe", attributes={
        "model_size": settings.whisper_model_size,
        "device": settings.whisper_device,
    }):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "transcribing", "active")

        transcriber = Transcriber(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        result = transcriber.transcribe(audio_path)
        return {"text": result.text, "language": result.language}


@activity.defn
async def extract_activity(transcript: str, user_id: str, queue_item_id: str) -> dict:
    with tracer.start_as_current_span("pipeline.ai_extract", attributes={
        "provider": settings.ai_provider,
        "model": settings.ai_model,
    }):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "extracting", "active")

        api_key = ""
        if settings.ai_provider == "anthropic":
            api_key = settings.anthropic_api_key
        elif settings.ai_provider == "openai":
            api_key = settings.openai_api_key

        extractor = RecipeExtractor(
            provider=settings.ai_provider,
            api_key=api_key,
            model=settings.ai_model,
            base_url=settings.ollama_base_url if settings.ai_provider == "ollama" else None,
        )
        result = await extractor.extract(transcript)
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
    url: str, transcript: str, extraction_data: dict, user_id: str, queue_item_id: str
) -> int:
    with tracer.start_as_current_span("pipeline.save"):
        queue = _get_queue()
        queue.publish_progress(user_id, queue_item_id, "saved", "active")

        from backend.database import engine
        from backend.models import Recipe
        from sqlmodel import Session

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
        )
        with Session(engine) as session:
            session.add(recipe)
            session.commit()
            session.refresh(recipe)

        # Mark queue item completed and publish final event
        queue.complete(queue_item_id, user_id)
        queue.publish_progress(user_id, queue_item_id, "saved", "complete")

        return recipe.id


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

        try:
            # Step 1: Download
            download_result = await workflow.execute_activity(
                download_activity,
                args=[input.url, user_id, item_id],
                start_to_close_timeout=timedelta(minutes=5),
            )

            # Step 2: Transcribe
            transcribe_result = await workflow.execute_activity(
                transcribe_activity,
                args=[download_result["audio_path"], user_id, item_id],
                start_to_close_timeout=timedelta(minutes=10),
            )

            # Step 3: Extract recipe via AI
            extraction_data = await workflow.execute_activity(
                extract_activity,
                args=[transcribe_result["text"], user_id, item_id],
                start_to_close_timeout=timedelta(minutes=2),
            )

            # Step 4: Save to database
            recipe_id = await workflow.execute_activity(
                save_recipe_activity,
                args=[input.url, transcribe_result["text"], extraction_data, user_id, item_id],
                start_to_close_timeout=timedelta(seconds=30),
            )

            return recipe_id
        except Exception as e:
            # Mark the queue item as failed so the UI reflects the error
            await workflow.execute_activity(
                fail_queue_item_activity,
                args=[user_id, item_id, str(e)],
                start_to_close_timeout=timedelta(seconds=10),
            )
            raise
