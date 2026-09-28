import logging
import os

from sqlmodel import Session, SQLModel, create_engine, text

from backend.config import settings

logger = logging.getLogger(__name__)

os.makedirs(os.path.dirname(settings.database_url.replace("sqlite:///", "")), exist_ok=True)

engine = create_engine(settings.database_url, echo=False)


def _migrate(engine):
    """Add columns that create_all() won't add to existing tables."""
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


def create_db():
    SQLModel.metadata.create_all(engine)
    _migrate(engine)


def get_session():
    with Session(engine) as session:
        yield session
