import logging
import os

from sqlmodel import Session, SQLModel, create_engine, text

from backend.config import settings

logger = logging.getLogger(__name__)

os.makedirs(os.path.dirname(settings.database_url.replace("sqlite:///", "")), exist_ok=True)

engine = create_engine(settings.database_url, echo=False)


def _migrate(engine):
    """Fixes create_all() can't do: new columns on existing tables, bad data from old versions."""
    migrations = [
        ("recipe", "share_token", "ALTER TABLE recipe ADD COLUMN share_token VARCHAR"),
        ("recipe", "queue_item_id", "ALTER TABLE recipe ADD COLUMN queue_item_id VARCHAR"),
        ("recipe", "thumbnail", "ALTER TABLE recipe ADD COLUMN thumbnail VARCHAR"),
    ]
    with Session(engine) as session:
        for table, column, sql in migrations:
            try:
                session.exec(text(f"SELECT {column} FROM {table} LIMIT 1"))
            except Exception:
                logger.info("Migrating: adding %s.%s", table, column)
                session.exec(text(sql))
                session.commit()
        # Before v1.2.0 the Settings page saved masked keys ("••••••abcd") back as the real value.
        # No real key starts with the mask; drop them so SettingsService falls back to .env.
        session.exec(text("DELETE FROM appsetting WHERE value LIKE '••••••%'"))
        session.commit()


def create_db():
    SQLModel.metadata.create_all(engine)
    _migrate(engine)


def get_session():
    with Session(engine) as session:
        yield session
