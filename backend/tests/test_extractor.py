import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.schemas import Ingredient
from backend.services.extractor import SYSTEM_PROMPT, RecipeExtractor, ExtractionResult


def test_extraction_result():
    result = ExtractionResult(
        title="Garlic Butter Pasta",
        ingredients=[Ingredient(name="pasta", quantity="400", unit="g")],
        instructions=["Boil pasta", "Make sauce"],
        prep_time_minutes=5,
        cook_time_minutes=15,
        servings=4,
        notes="Add chili flakes",
        tags=[],
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


def test_parse_response_ignores_preamble_and_fences():
    extractor = RecipeExtractor(provider="anthropic", api_key="k", model="m")
    raw = f"Sure! Here's the recipe:\n```json\n{MOCK_AI_RESPONSE}\n```\nEnjoy!"
    assert extractor._parse_response(raw).title == "Garlic Butter Pasta"


@pytest.mark.asyncio
@pytest.mark.parametrize("base_url", ["http://ollama:11434", "http://ollama:11434/v1/"])
@patch("backend.services.extractor.openai.AsyncOpenAI")
async def test_ollama_base_url_gets_v1_once(mock_openai_class, base_url):
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create = AsyncMock(
        return_value=MagicMock(choices=[MagicMock(message=MagicMock(content=MOCK_AI_RESPONSE))])
    )

    extractor = RecipeExtractor(provider="ollama", api_key="", model="llama3", base_url=base_url)
    await extractor.extract("pasta")

    assert mock_openai_class.call_args.kwargs["base_url"] == "http://ollama:11434/v1"


def test_prompt_delimits_caption_and_omits_it_when_empty():
    extractor = RecipeExtractor(provider="anthropic", api_key="k", model="m")
    assert "<caption>\n200g spaghetti\n</caption>" in extractor._build_prompt("talk", "200g spaghetti")
    assert "<caption>" not in extractor._build_prompt("talk", "")
    assert "untrusted" in SYSTEM_PROMPT


def test_parse_response_tolerates_nulls_from_small_models():
    # The prompt says "use null if not mentioned"; small models apply that to lists and title too
    raw = json.dumps({"title": None, "ingredients": None, "instructions": None, "tags": None,
                      "servings": None, "notes": None})
    result = RecipeExtractor(provider="openai", api_key="k", model="m")._parse_response(raw)
    assert (result.title, result.ingredients, result.instructions, result.tags) == ("Untitled recipe", [], [], [])


def test_parse_response_drops_nameless_ingredients():
    raw = json.dumps({"title": "T", "instructions": [], "ingredients": [{"name": None, "quantity": "1"}, {"name": "salt"}]})
    result = RecipeExtractor(provider="openai", api_key="k", model="m")._parse_response(raw)
    assert [i.name for i in result.ingredients] == ["salt"]


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["openai", "ollama"])
@patch("backend.services.extractor.openai.AsyncOpenAI")
async def test_openai_compatible_calls_use_json_mode(mock_openai_class, provider):
    # Measured on LFM2.5 via oMLX: plain 1/3 valid JSON (~45s), JSON mode 3/3 (~13s)
    create = mock_openai_class.return_value.chat.completions.create = AsyncMock(
        return_value=MagicMock(choices=[MagicMock(message=MagicMock(content=MOCK_AI_RESPONSE))])
    )
    await RecipeExtractor(provider=provider, api_key="k", model="m").extract("pasta")
    assert create.call_args.kwargs["response_format"] == {"type": "json_object"}
