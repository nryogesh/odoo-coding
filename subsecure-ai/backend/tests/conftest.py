import os
import tempfile

# Point the app at a throwaway database BEFORE importing app modules.
_TMP_DB = tempfile.mktemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["JWT_SECRET"] = "test-secret-key-not-for-production"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.seed.seed_demo import seed  # noqa: E402

ADMIN = {"email": "admin@brightloop.io", "password": "Admin@12345"}
STAFF = {"email": "staff@brightloop.io", "password": "Staff@12345"}
CUSTOMER = {"email": "customer@acme.io", "password": "Customer@12345"}


@pytest.fixture(scope="session", autouse=True)
def seeded_db():
    init_db()
    seed()
    yield
    engine.dispose()
    if os.path.exists(_TMP_DB):
        os.remove(_TMP_DB)


@pytest.fixture(scope="session")
def client(seeded_db):
    with TestClient(app) as c:
        yield c


def _token(client, creds) -> str:
    resp = client.post("/api/v1/auth/login", json=creds)
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(client):
    return _token(client, ADMIN)


@pytest.fixture(scope="session")
def staff_token(client):
    return _token(client, STAFF)


@pytest.fixture(scope="session")
def customer_token(client):
    return _token(client, CUSTOMER)


def auth(token):
    return {"Authorization": f"Bearer {token}"}
