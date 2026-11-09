import logging
import os

from sqlmodel import Session, SQLModel, create_engine, text

from backend.config import settings
from backend.services.settings import MASK

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
        # Old versions saved masked keys ("••••••abcd") as real ones; drop them so settings fall back to .env.
        session.exec(text(f"DELETE FROM appsetting WHERE value LIKE '{MASK}%'"))
        session.commit()


def create_db():
    SQLModel.metadata.create_all(engine)
    _migrate(engine)


def get_session():
    with Session(engine) as session:
        yield session
