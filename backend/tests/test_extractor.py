import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.schemas import Ingredient
from backend.services.extractor import RecipeExtractor, ExtractionResult


def test_extraction_result():
    result = ExtractionResult(
        title="Garlic Butter Pasta",
        ingredients=[Ingredient(name="pasta", quantity="400", unit="g")],
        instructions=["Boil pasta", "Make sauce"],
        prep_time_minutes=5,
        cook_time_minutes=15,
        servings=4,
        notes="Add chili flakes",
    )
    assert result.title == "Garlic Butter Pasta"
    assert len(result.ingredients) == 1
    assert len(result.instructions) == 2


def test_build_prompt_contains_transcript():
    extractor = RecipeExtractor(
        provider="anthropic", api_key="test-key", model="claude-sonnet-4-6"
    )
    prompt = extractor._build_prompt("today we make garlic butter pasta with 400g spaghetti")
    assert "garlic butter pasta" in prompt
    assert "400g spaghetti" in prompt


MOCK_AI_RESPONSE = json.dumps({
    "title": "Garlic Butter Pasta",
    "ingredients": [
        {"name": "spaghetti", "quantity": "400", "unit": "g"},
        {"name": "butter", "quantity": "50", "unit": "g"},
    ],
    "instructions": ["Boil pasta", "Melt butter", "Toss together"],
    "prep_time_minutes": 5,
    "cook_time_minutes": 15,
    "servings": 4,
    "notes": "Add parmesan on top",
})


@pytest.mark.asyncio
@patch("backend.services.extractor.anthropic.AsyncAnthropic")
async def test_extract_with_anthropic(mock_anthropic_class):
    mock_client = AsyncMock()
    mock_anthropic_class.return_value = mock_client

    mock_message = MagicMock()
    mock_content_block = MagicMock()
    mock_content_block.text = MOCK_AI_RESPONSE
    mock_message.content = [mock_content_block]
    mock_client.messages.create = AsyncMock(return_value=mock_message)

    extractor = RecipeExtractor(
        provider="anthropic", api_key="test-key", model="claude-sonnet-4-6"
    )
    result = await extractor.extract("today we make garlic butter pasta...")

    assert result.title == "Garlic Butter Pasta"
    assert len(result.ingredients) == 2
    assert result.ingredients[0].name == "spaghetti"
    assert result.servings == 4


@pytest.mark.asyncio
@patch("backend.services.extractor.openai.AsyncOpenAI")
async def test_extract_with_openai(mock_openai_class):
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    mock_choice = MagicMock()
    mock_choice.message.content = MOCK_AI_RESPONSE
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    extractor = RecipeExtractor(
        provider="openai", api_key="test-key", model="gpt-4o"
    )
    result = await extractor.extract("today we make garlic butter pasta...")

    assert result.title == "Garlic Butter Pasta"
    assert len(result.ingredients) == 2
