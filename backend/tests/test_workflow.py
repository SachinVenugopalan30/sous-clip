import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.schemas import Ingredient
from backend.services.extractor import ExtractionResult
from backend.workflows.extraction import (
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
async def test_transcribe_activity(mock_tr_cls, mock_get_queue):
    mock_queue = MagicMock()
    mock_get_queue.return_value = mock_queue
    mock_tr = MagicMock()
    mock_tr.transcribe.return_value = MagicMock(text="pasta recipe", language="en")
    mock_tr_cls.return_value = mock_tr

    result = await transcribe_activity("/tmp/a.mp3", "user-1", "q-123")
    assert result["text"] == "pasta recipe"
    assert result["language"] == "en"
    mock_queue.publish_progress.assert_called()


@pytest.mark.asyncio
@patch("backend.workflows.extraction._get_queue")
@patch("backend.workflows.extraction.RecipeExtractor")
async def test_extract_activity(mock_ex_cls, mock_get_queue):
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
    ))
    mock_ex_cls.return_value = mock_ex

    result = await extract_activity("pasta recipe", "user-1", "q-123")
    assert result["title"] == "Pasta"
    assert len(result["ingredients"]) == 1
    mock_queue.publish_progress.assert_called()
