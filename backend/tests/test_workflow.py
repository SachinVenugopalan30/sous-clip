import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from sqlmodel import select

from backend.config import settings
from backend.models import AppSetting, Recipe
from backend.schemas import Ingredient
from backend.services.extractor import ExtractionResult
from backend.workflows.extraction import (
    ExtractionWorkflow,
    ExtractionWorkflowInput,
    download_activity,
    transcribe_activity,
    extract_activity,
    save_recipe_activity,
)


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.Downloader")
async def test_download_activity(mock_dl_cls, mock_get_queue):
    mock_queue = MagicMock()
    mock_get_queue.return_value = mock_queue
    mock_dl = MagicMock()
    mock_dl.download.return_value = MagicMock(audio_path="/tmp/a.mp3", title="Pasta")
    mock_dl_cls.return_value = mock_dl

    result = await download_activity("https://youtube.com/shorts/abc", "user-1", "q-123")
    assert result["audio_path"] == "/tmp/a.mp3"
    assert result["title"] == "Pasta"
    mock_queue.publish_progress.assert_called()


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.Transcriber")
async def test_transcribe_activity(mock_tr_cls, mock_get_queue, db_engine, db_session, tmp_path):
    audio = tmp_path / "a.mp3"
    audio.write_bytes(b"")
    db_session.add(AppSetting(key="whisper_model_size", value="small"))
    db_session.commit()
    mock_queue = MagicMock()
    mock_get_queue.return_value = mock_queue
    mock_tr = MagicMock()
    mock_tr.transcribe.return_value = MagicMock(text="pasta recipe", language="en")
    mock_tr_cls.return_value = mock_tr

    with patch("backend.database.engine", db_engine):
        result = await transcribe_activity(str(audio), "user-1", "q-123")
    assert not audio.exists()
    assert mock_tr_cls.call_args.kwargs["model_size"] == "small"
    assert result["text"] == "pasta recipe"
    assert result["language"] == "en"
    mock_queue.publish_progress.assert_called()


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.RecipeExtractor")
async def test_extract_activity(mock_ex_cls, mock_get_queue, db_engine, db_session):
    db_session.add(AppSetting(key="ai_provider", value="openai"))
    db_session.add(AppSetting(key="ai_model", value="gpt-test"))
    db_session.add(AppSetting(key="openai_api_key", value="sk-db"))
    db_session.commit()
    mock_queue = MagicMock()
    mock_get_queue.return_value = mock_queue
    mock_ex = MagicMock()
    mock_ex.extract = AsyncMock(return_value=ExtractionResult(
        title="Pasta",
        ingredients=[Ingredient(name="pasta", quantity="500", unit="g")],
        instructions=["Boil"],
        prep_time_minutes=5,
        cook_time_minutes=10,
        servings=2,
        notes=None,
        tags=[],
    ))
    mock_ex_cls.return_value = mock_ex

    with patch("backend.database.engine", db_engine):
        result = await extract_activity("pasta recipe", "user-1", "q-123")
    assert mock_ex_cls.call_args.kwargs == {
        "provider": "openai", "api_key": "sk-db", "model": "gpt-test", "base_url": None, "api_style": "openai",
    }
    assert result["title"] == "Pasta"
    assert len(result["ingredients"]) == 1
    mock_queue.publish_progress.assert_called()


@pytest.mark.asyncio
@patch("backend.workflows.extraction.workflow.execute_activity", new_callable=AsyncMock)
async def test_pipeline_steps_have_bounded_retries(mock_execute):
    # Temporal's default retries forever, so a bad LLM reply would hang the job
    mock_execute.return_value = MagicMock()  # activity results are plain dicts, not awaitables
    await ExtractionWorkflow().run(ExtractionWorkflowInput(url="u", user_id="u1", queue_item_id="q1"))

    steps = {c.args[0]: c.kwargs.get("retry_policy") for c in mock_execute.call_args_list}
    for step in (download_activity, transcribe_activity, extract_activity, save_recipe_activity):
        assert steps[step] is not None and steps[step].maximum_attempts == 3, step.__name__


def _extraction(title):
    return {"title": title, "ingredients": [], "instructions": ["Boil"], "tags": []}


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
async def test_save_retry_is_idempotent_and_keeps_first_result(mock_get_queue, db_engine, db_session):
    # A container kill after commit but before queue.complete makes Temporal retry the save
    with patch("backend.database.engine", db_engine):
        first = await save_recipe_activity("u", "t", _extraction("First"), "user-1", "q-1")
        second = await save_recipe_activity("u", "t", _extraction("Second"), "user-1", "q-1")

    assert first == second
    recipes = db_session.exec(select(Recipe)).all()
    assert [r.title for r in recipes] == ["First"]


@pytest.mark.asyncio
@patch("backend.workflows.extraction.workflow.execute_activity", new_callable=AsyncMock)
async def test_workflow_passes_caption_and_tolerates_old_download_results(mock_execute):
    # Histories recorded before v1.3.0 replay download results without "caption"
    results = {download_activity: {"audio_path": "a"}, transcribe_activity: {"text": "t"}}
    mock_execute.side_effect = lambda fn, **kw: results.get(fn, {})

    await ExtractionWorkflow().run(ExtractionWorkflowInput(url="u", user_id="u1", queue_item_id="q1"))

    extract_call = next(c for c in mock_execute.call_args_list if c.args[0] is extract_activity)
    assert extract_call.kwargs["args"][-2:] == ["", ""]  # caption, video title


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.RecipeExtractor")
async def test_extract_activity_forwards_caption(mock_ex_cls, mock_get_queue, db_engine):
    mock_ex_cls.return_value.extract = AsyncMock(return_value=ExtractionResult(
        title="P", ingredients=[], instructions=[], prep_time_minutes=None,
        cook_time_minutes=None, servings=None, notes=None, tags=[],
    ))
    with patch("backend.database.engine", db_engine):
        await extract_activity("talk", "user-1", "q-1", "200g spaghetti")

    mock_ex_cls.return_value.extract.assert_awaited_once_with("talk", "200g spaghetti", "")


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
async def test_save_stores_one_thumbnail_even_on_retry(mock_get_queue, db_engine, db_session, tmp_path, monkeypatch):
    thumbs = tmp_path / "thumbs"
    monkeypatch.setattr(settings, "thumbnails_dir", str(thumbs))
    first_src, retry_src = tmp_path / "abc.webp", tmp_path / "abc2.webp"
    first_src.write_bytes(b"img")
    retry_src.write_bytes(b"img")

    with patch("backend.database.engine", db_engine):
        await save_recipe_activity("u", "t", _extraction("P"), "user-1", "q-1", str(first_src))
        await save_recipe_activity("u", "t", _extraction("P"), "user-1", "q-1", str(retry_src))

    stored = list(thumbs.iterdir())
    assert len(stored) == 1 and stored[0].suffix == ".webp" and stored[0].read_bytes() == b"img"
    assert not first_src.exists() and not retry_src.exists()
    assert db_session.exec(select(Recipe)).one().thumbnail == stored[0].name


@pytest.mark.asyncio
@patch("backend.workflows.extraction.workflow.execute_activity", new_callable=AsyncMock)
async def test_failed_step_is_reported_with_its_name(mock_execute):
    from temporalio.exceptions import ApplicationError

    def run_step(fn, **kw):
        if fn is extract_activity:
            raise ApplicationError("Connection error.", type="APIConnectionError")
        return MagicMock()
    mock_execute.side_effect = run_step

    with pytest.raises(ApplicationError):
        await ExtractionWorkflow().run(ExtractionWorkflowInput(url="u", user_id="u1", queue_item_id="q1"))

    fail_call = next(c for c in mock_execute.call_args_list if c.args[0].__name__ == "fail_queue_item_activity")
    assert fail_call.kwargs["args"][2].startswith("AI extraction failed: Can't reach the AI endpoint")


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.RecipeExtractor")
async def test_extract_activity_passes_custom_endpoint_settings(mock_ex_cls, mock_get_queue, db_engine, db_session):
    for key, value in {"ai_provider": "custom", "ai_model": "lfm", "custom_base_url": "http://h:3456",
                       "custom_api_key": "", "custom_api_style": "anthropic"}.items():
        db_session.add(AppSetting(key=key, value=value))
    db_session.commit()
    mock_ex_cls.return_value.extract = AsyncMock(return_value=ExtractionResult(
        title="P", ingredients=[], instructions=[], prep_time_minutes=None,
        cook_time_minutes=None, servings=None, notes=None, tags=[],
    ))
    with patch("backend.database.engine", db_engine):
        await extract_activity("talk", "user-1", "q-1")

    assert mock_ex_cls.call_args.kwargs == {
        "provider": "custom", "api_key": "", "model": "lfm", "base_url": "http://h:3456", "api_style": "anthropic",
    }
