"""Regression coverage for Kirthi's security and financial invariants."""

from decimal import Decimal

import pytest

from app.config import Settings
from app.database import SessionLocal
from app.models import BillingRun, DiscountRule, Invoice


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_billing_simulation_is_database_read_only(client, admin_token):
    db = SessionLocal()
    try:
        before_runs = db.query(BillingRun).count()
        before_usage = {
            rule.id: rule.usage_count
            for rule in db.query(DiscountRule).all()
        }
    finally:
        db.close()

    response = client.post(
        "/api/v1/billing/simulate",
        json={},
        headers=auth(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["dry_run"] is True

    db = SessionLocal()
    try:
        assert db.query(BillingRun).count() == before_runs
        assert {
            rule.id: rule.usage_count
            for rule in db.query(DiscountRule).all()
        } == before_usage
    finally:
        db.close()


def test_customer_ai_mrr_matches_only_customer_scope(client, customer_token):
    analytics = client.get("/api/v1/analytics/mrr", headers=auth(customer_token))
    assert analytics.status_code == 200
    expected = Decimal(str(analytics.json()["mrr"]))

    response = client.post(
        "/api/v1/assistant/query",
        json={"question": "Calculate current MRR"},
        headers=auth(customer_token),
    )
    assert response.status_code == 200
    assert Decimal(response.json()["results"][0]["mrr"]) == expected


def test_payment_rejects_sub_cent_amount(client, admin_token):
    invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    invoice = next(i for i in invoices if Decimal(i["balance"]) > 0)
    response = client.post(
        "/api/v1/payments",
        json={"invoice_id": invoice["id"], "amount": "0.001"},
        headers=auth(admin_token),
    )
    assert response.status_code == 422


def test_production_rejects_predictable_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(APP_ENV="production", JWT_SECRET="short-secret")
