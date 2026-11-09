from sqlmodel import Session, select

from backend.database import _migrate
from backend.models import AppSetting


def test_migrate_drops_masked_placeholders_saved_by_old_versions(db_engine):
    # Old versions saved the masked key as the real one, which broke every extraction.
    with Session(db_engine) as session:
        session.add(AppSetting(key="openai_api_key", value="••••••abcd"))
        session.add(AppSetting(key="anthropic_api_key", value="sk-ant-real"))
        session.commit()

    _migrate(db_engine)

    with Session(db_engine) as session:
        assert {s.key: s.value for s in session.exec(select(AppSetting))} == {"anthropic_api_key": "sk-ant-real"}
