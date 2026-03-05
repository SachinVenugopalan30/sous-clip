import json
from dataclasses import dataclass

import anthropic
import openai

from backend.schemas import Ingredient


SYSTEM_PROMPT = """You are a recipe extraction assistant. Given a transcript from a cooking video, extract the structured recipe data.

Return ONLY valid JSON matching this exact schema:
{
  "title": "string - the dish name",
  "ingredients": [{"name": "string", "quantity": "string or null", "unit": "string or null"}],
  "instructions": ["string - each step"],
  "prep_time_minutes": "integer or null",
  "cook_time_minutes": "integer or null",
  "servings": "integer or null",
  "notes": "string or null - any tips from the creator",
  "tags": ["string - cuisine/category tags, e.g. 'Italian', 'Vegan', 'Quick', 'Dessert'"]
}

Rules:
- Extract only what is mentioned in the transcript
- If a value is not mentioned, use null
- Keep instructions as clear, concise steps
- Normalize ingredient quantities (e.g., "a couple" → "2")
- Include 1-3 tags for cuisine type, dietary category, or meal type
- Return ONLY the JSON, no markdown fences or extra text"""


@dataclass
class ExtractionResult:
    title: str
    ingredients: list[Ingredient]
    instructions: list[str]
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    servings: int | None
    notes: str | None
    tags: list[str]


class RecipeExtractor:
    def __init__(self, provider: str, api_key: str, model: str, base_url: str | None = None):
        self.provider = provider
        self.api_key = api_key
        self.model = model
        self.base_url = base_url

    def _build_prompt(self, transcript: str) -> str:
        return f"Extract the recipe from this cooking video transcript:\n\n{transcript}"

    async def extract(self, transcript: str) -> ExtractionResult:
        prompt = self._build_prompt(transcript)

        if self.provider == "anthropic":
            raw = await self._call_anthropic(prompt)
        elif self.provider == "openai":
            raw = await self._call_openai(prompt)
        elif self.provider == "ollama":
            raw = await self._call_ollama(prompt)
        else:
            raise ValueError(f"Unknown AI provider: {self.provider}")

        return self._parse_response(raw)

    async def _call_anthropic(self, prompt: str) -> str:
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        message = await client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def _call_openai(self, prompt: str) -> str:
        client = openai.AsyncOpenAI(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2048,
        )
        return response.choices[0].message.content

    async def _call_ollama(self, prompt: str) -> str:
        client = openai.AsyncOpenAI(
            api_key="ollama",
            base_url=self.base_url or "http://localhost:11434/v1",
        )
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2048,
        )
        return response.choices[0].message.content

    def _parse_response(self, raw: str) -> ExtractionResult:
        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]

        data = json.loads(text)

        ingredients = [
            Ingredient(
                name=i["name"],
                quantity=i.get("quantity"),
                unit=i.get("unit"),
            )
            for i in data["ingredients"]
        ]

        return ExtractionResult(
            title=data["title"],
            ingredients=ingredients,
            instructions=data["instructions"],
            prep_time_minutes=data.get("prep_time_minutes"),
            cook_time_minutes=data.get("cook_time_minutes"),
            servings=data.get("servings"),
            notes=data.get("notes"),
            tags=data.get("tags", []),
        )
