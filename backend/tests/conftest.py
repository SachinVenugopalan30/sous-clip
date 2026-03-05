import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

import backend.models  # noqa: F401 — register table metadata
from backend.main import app
from backend.services.auth import create_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    token = create_token(username="testuser")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db_engine(tmp_path):
    db_url = f"sqlite:///{tmp_path}/test.db"
    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine):
    with Session(db_engine) as session:
        yield session
