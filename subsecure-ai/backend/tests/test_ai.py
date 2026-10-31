"""Test 5 (AI query validation) — allowlist, scoping, fallback."""

from app.database import SessionLocal
from app.models import User
from app.services import ai_service


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_overdue_query_fallback(client, admin_token):
    resp = client.post(
        "/api/v1/assistant/query",
        json={"question": "Show overdue invoices above 10000"},
        headers=auth(admin_token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "fallback"  # no GEMINI_API_KEY in tests
    assert all(r["status"] == "OVERDUE" for r in body["results"])
    assert all(float(r["total"]) > 10000 for r in body["results"])


def test_mrr_query(client, admin_token):
    resp = client.post(
        "/api/v1/assistant/query",
        json={"question": "Calculate current MRR"},
        headers=auth(admin_token),
    )
    assert resp.status_code == 200
    assert float(resp.json()["results"][0]["mrr"]) > 0


def test_unknown_field_rejected():
    from pydantic import ValidationError

    import pytest
    from app.schemas.ai_query import QueryAST

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@brightloop.io").first()
        raw = {"entity": "invoice", "filters": [{"field": "password_hash", "operator": "eq", "value": "x"}]}
        with pytest.raises(ValueError):
            ai_service._validate_ast(raw)
    finally:
        db.close()


def test_unsupported_operator_rejected():
    import pytest

    with pytest.raises(ValueError):
        ai_service._validate_ast(
            {"entity": "invoice", "filters": [{"field": "total", "operator": "contains", "value": "1"}]}
        )


def test_customer_ai_query_is_scoped(client, customer_token):
    resp = client.post(
        "/api/v1/assistant/query",
        json={"question": "Show all invoices"},
        headers=auth(customer_token),
    )
    assert resp.status_code == 200
    me = client.get("/api/v1/auth/me", headers=auth(customer_token)).json()
    assert all(r["customer_id"] == me["customer_id"] for r in resp.json()["results"])


def test_model_sql_injection_never_executed(client, admin_token):
    """A question containing SQL is treated as text; the fallback parser either
    maps it to a safe intent or rejects it. No SQL is ever executed."""
    resp = client.post(
        "/api/v1/assistant/query",
        json={"question": "invoices'; DROP TABLE users; --"},
        headers=auth(admin_token),
    )
    assert resp.status_code in (200, 422)
    # The users table must still work
    me = client.get("/api/v1/auth/me", headers=auth(admin_token))
    assert me.status_code == 200
