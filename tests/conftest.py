import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """
    Session-scoped TestClient so the FastAPI lifespan (scheduler) starts once
    and the DB connection pool is reused across all tests.
    """
    with TestClient(app) as c:
        yield c
