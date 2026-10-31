"""Test 1 (duplicate invoice) + Test 6 (financial consistency)."""

from decimal import Decimal

H = None  # header helper filled by fixtures


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _execute(client, token):
    return client.post(
        "/api/v1/billing/execute", json={"confirm": True}, headers=auth(token)
    )


def test_simulate_creates_no_invoices(client, admin_token):
    before = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    resp = client.post("/api/v1/billing/simulate", json={}, headers=auth(admin_token))
    assert resp.status_code == 200
    assert resp.json()["dry_run"] is True
    after = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    assert len(before) == len(after), "Simulation must never create invoices"


def test_duplicate_billing_prevented(client, admin_token):
    # First execution
    r1 = _execute(client, admin_token)
    assert r1.status_code == 200
    d1 = r1.json()
    period = d1["period"]

    invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    period_invoices = [i for i in invoices if i["billing_period_key"] == period]
    count_after_first = len(period_invoices)

    # Second execution with the same key
    d2 = _execute(client, admin_token).json()
    invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    period_invoices_after = [i for i in invoices if i["billing_period_key"] == period]

    assert len(period_invoices_after) == count_after_first, "Duplicate execution created invoices"
    assert d2["generated_count"] == 0
    if d1["generated_count"] > 0:
        assert d2["duplicate_count"] >= 1, "Second run must report duplicates"

    # Uniqueness of (subscription, period) invariant across the whole table
    keys = [(i["subscription_id"], i["billing_period_key"]) for i in invoices]
    assert len(keys) == len(set(keys)), "Database invariant violated: duplicate (subscription, period)"


def test_execute_requires_confirmation(client, admin_token):
    resp = client.post("/api/v1/billing/execute", json={"confirm": False}, headers=auth(admin_token))
    assert resp.status_code == 400


def test_invoice_math_and_partial_payment(client, admin_token):
    # Use the seeded Acme invoice from the billing run (12 seats x 5000 = 60000)
    invoices = client.get("/api/v1/invoices", headers=auth(admin_token)).json()
    target = next(i for i in invoices if i["invoice_number"].startswith("INV-SUB-1001-2026-"))
    subtotal = Decimal(target["subtotal"])
    assert subtotal == Decimal("60000.00")
    # Discounts: 15% seat discount (9000) + loyalty fixed (1000) = 10000
    assert Decimal(target["discount_total"]) == Decimal("10000.00")
    # Tax: 18% on (60000 - 10000) = 9000
    assert Decimal(target["tax_total"]) == Decimal("9000.00")
    assert Decimal(target["total"]) == Decimal("59000.00")

    # Partial payment leaves a balance and does NOT mark paid
    half = Decimal(target["total"]) / 2
    bal_before = client.get(
        f"/api/v1/invoices/{target['id']}/balance", headers=auth(admin_token)
    ).json()
    outstanding = Decimal(bal_before["balance"])
    pay_amount = outstanding / 2
    r = client.post(
        "/api/v1/payments",
        json={"invoice_id": target["id"], "amount": str(pay_amount)},
        headers=auth(admin_token),
    )
    assert r.status_code == 201
    bal = client.get(f"/api/v1/invoices/{target['id']}/balance", headers=auth(admin_token)).json()
    assert Decimal(bal["balance"]) == outstanding - pay_amount
    assert bal["status"] != "PAID"

    # Overpayment rejected
    r = client.post(
        "/api/v1/payments",
        json={"invoice_id": target["id"], "amount": str(Decimal(bal["balance"]) + 1)},
        headers=auth(admin_token),
    )
    assert r.status_code == 400

    # Final payment marks invoice PAID exactly when total is covered
    r = client.post(
        "/api/v1/payments",
        json={"invoice_id": target["id"], "amount": bal["balance"]},
        headers=auth(admin_token),
    )
    assert r.status_code == 201
    bal = client.get(f"/api/v1/invoices/{target['id']}/balance", headers=auth(admin_token)).json()
    assert bal["status"] == "PAID"
    assert Decimal(bal["balance"]) == Decimal("0.00")


def test_variant_surcharge(client, admin_token):
    """Odoo variant adds ₹560 to the ₹5,000 base price (spec example)."""
    products = client.get("/api/v1/products", headers=auth(admin_token)).json()
    crm = next(p for p in products if p["name"] == "Brightloop CRM")
    odoo_variant = next(v for v in crm["variants"] if v["name"] == "Odoo Brand")
    plans = client.get("/api/v1/plans", headers=auth(admin_token)).json()
    plan = next(p for p in plans if p["billing_interval"] == "MONTHLY")
    customers = client.get("/api/v1/customers", headers=auth(admin_token)).json()
    resp = client.post(
        "/api/v1/subscriptions",
        json={
            "customer_id": customers[0]["id"],
            "plan_id": plan["id"],
            "start_date": "2026-10-01",
            "lines": [{"product_id": crm["id"], "variant_id": odoo_variant["id"], "quantity": 1}],
        },
        headers=auth(admin_token),
    )
    assert resp.status_code == 201
    assert Decimal(resp.json()["lines"][0]["unit_price"]) == Decimal("5560.00")


def test_invalid_subscription_transition_rejected(client, admin_token):
    subs = client.get("/api/v1/subscriptions", headers=auth(admin_token)).json()
    closed = next(s for s in subs if s["status"] == "CLOSED")
    resp = client.post(
        f"/api/v1/subscriptions/{closed['id']}/transition",
        json={"action": "ACTIVE"},
        headers=auth(admin_token),
    )
    assert resp.status_code == 400
