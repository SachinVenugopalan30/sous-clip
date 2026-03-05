from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Recipe(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    source_url: str
    ingredients_json: str  # JSON string of list[{name, quantity, unit}]
    instructions_json: str  # JSON string of list[str]
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    tags_json: str = "[]"  # JSON string of list[str]
    notes: str | None = None
    transcript: str | None = None
    share_token: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
